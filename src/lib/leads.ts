import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { MARKETING_POSTAL_ADDRESS, SITE_URL } from "@/lib/site";
import { marketingEnabled } from "@/lib/marketing";
import { earningsBreakdownEmail, leadFollowupEmail, sendMarketingEmail } from "@/lib/email";
import { EARNINGS_CONSENT_TEXT, VEHICLES, type VehicleId } from "@/lib/earnings";

// Email signups from free public tools (owner-approved 2026-10-02). Leads have
// no account, so they get their own unsubscribe token and opt-out flag
// (Lead.unsubscribedAt) instead of the account-based ones in lib/marketing.ts.
// Only the email the person asked for is sent here; any later email to leads
// needs the owner's approval first, like M1–M4.

export const EARNINGS_QUIZ_SOURCE = "earnings-quiz";
/** One email per address per this many hours, so the form can't flood an inbox. */
export const LEAD_EMAIL_GAP_HOURS = 24;

// ---- Unsubscribe links ------------------------------------------------------
// Token `<leadId>.<sig>`, sig = HMAC-SHA256(AUTH_SECRET, "lead-unsubscribe:<leadId>").
// Different prefix from account tokens, so neither can pass as the other.

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}
const sign = (leadId: string) => createHmac("sha256", secret()).update(`lead-unsubscribe:${leadId}`).digest("base64url");

export function leadUnsubscribeUrl(leadId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  return `${base}/api/unsubscribe?l=${encodeURIComponent(`${leadId}.${sign(leadId)}`)}`;
}

export function verifyLeadUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const leadId = token.slice(0, dot);
  const a = Buffer.from(token.slice(dot + 1));
  const b = Buffer.from(sign(leadId));
  return a.length === b.length && timingSafeEqual(a, b) ? leadId : null;
}

/** Stop all email to a lead. Idempotent. */
export async function unsubscribeLead(leadId: string): Promise<void> {
  await prisma.lead.updateMany({ where: { id: leadId, unsubscribedAt: null }, data: { unsubscribedAt: new Date() } });
}

// ---- Signup -----------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export type BreakdownResult =
  | { ok: true; status: "sent"; newLead: boolean; leadId: string }
  | { ok: true; status: "already-sent-today" }
  | { ok: false; error: string };

/**
 * Save (or refresh) an earnings-quiz signup and email the breakdown they asked
 * for. Submitting again counts as fresh consent, so it also clears an earlier
 * unsubscribe — the person is asking for the email right now.
 */
export async function requestBreakdown(rawEmail: string, vehicleId: string): Promise<BreakdownResult> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Please enter a valid email address." };
  const vehicle = VEHICLES.find((v) => v.id === (vehicleId as VehicleId));
  if (!vehicle) return { ok: false, error: "Pick your vehicle first." };
  if (!marketingEnabled()) return { ok: false, error: "Email isn't available right now. Please try again later." };

  const existing = await prisma.lead.findUnique({ where: { email } });
  if (existing?.lastEmailedAt && Date.now() - existing.lastEmailedAt.getTime() < LEAD_EMAIL_GAP_HOURS * 3_600_000) {
    return { ok: true, status: "already-sent-today" };
  }

  const consent = { vehicle: vehicle.id, source: EARNINGS_QUIZ_SOURCE, consentText: EARNINGS_CONSENT_TEXT, consentAt: new Date(), unsubscribedAt: null };
  const lead = existing
    ? await prisma.lead.update({ where: { id: existing.id }, data: consent })
    : await prisma.lead.create({ data: { email, ...consent } });

  const res = await sendMarketingEmail({
    to: email,
    ...earningsBreakdownEmail(vehicle),
    unsubscribeUrl: leadUnsubscribeUrl(lead.id),
    postalAddress: MARKETING_POSTAL_ADDRESS,
    reason: "You're getting this because you asked for it on FlowSync's load-rate tool.",
  });
  if (!res.sent) return { ok: false, error: "We couldn't send the email just now. Please try again in a few minutes." };

  await prisma.lead.update({ where: { id: lead.id }, data: { lastEmailedAt: new Date() } });
  return { ok: true, status: "sent", newLead: !existing, leadId: lead.id };
}

// ---- Follow-ups L1–L3 (owner-approved 2026-10-02) ----------------------------
// Day 2, 5 and 10 after signup (consentAt), run by the daily cron. No schema
// change: a step counts as sent once lastEmailedAt is on/after its day. Each
// step only goes out inside its own window (until the next step's day), so a
// missed step is skipped, never sent late. Stops on unsubscribe, after L3, or
// once the email belongs to a paying driver.

export const LEAD_FOLLOWUPS = [
  { step: 1 as const, day: 2, until: 5 },
  { step: 2 as const, day: 5, until: 10 },
  { step: 3 as const, day: 10, until: 14 },
];
const LEAD_GAP_HOURS = 48;

/** Which follow-up (if any) is due for a lead right now. Pure — exported for tests. */
export function dueLeadStep(lead: { consentAt: Date; lastEmailedAt: Date | null }, now = new Date()): 1 | 2 | 3 | null {
  const DAY = 86_400_000;
  const age = (now.getTime() - lead.consentAt.getTime()) / DAY;
  const last = lead.lastEmailedAt?.getTime() ?? 0;
  if (last && now.getTime() - last < LEAD_GAP_HOURS * 3_600_000) return null;
  for (const f of LEAD_FOLLOWUPS) {
    const sent = last >= lead.consentAt.getTime() + f.day * DAY;
    if (age >= f.day && age < f.until && !sent) return f.step;
  }
  return null;
}

export async function runLeadFollowups(now = new Date()): Promise<{ kind: string; sent: number; skipped: number }> {
  const report = { kind: "lead-followups", sent: 0, skipped: 0 };
  if (!marketingEnabled()) return report;
  const since = new Date(now.getTime() - 15 * 86_400_000);
  const leads = await prisma.lead.findMany({ where: { unsubscribedAt: null, consentAt: { gte: since } } });
  if (leads.length === 0) return report;

  // Anyone who has since paid for a listing or the fleet is a customer now — stop.
  const paid = await prisma.user.findMany({
    where: {
      OR: leads.map((l) => ({ email: { equals: l.email, mode: "insensitive" as const } })),
      payments: { some: { status: "PAID", type: { in: ["LISTING", "FLEET"] } } },
    },
    select: { email: true },
  });
  const customers = new Set(paid.map((u) => u.email.toLowerCase()));

  for (const lead of leads) {
    try {
      const step = dueLeadStep(lead, now);
      if (!step) continue;
      if (customers.has(lead.email)) {
        report.skipped++;
        continue;
      }
      const vehicle = VEHICLES.find((v) => v.id === lead.vehicle);
      const res = await sendMarketingEmail({
        to: lead.email,
        ...leadFollowupEmail(step, vehicle),
        unsubscribeUrl: leadUnsubscribeUrl(lead.id),
        postalAddress: MARKETING_POSTAL_ADDRESS,
        reason: "You're getting this because you signed up for driver tips on FlowSync's load-rate tool.",
      });
      if (!res.sent) {
        report.skipped++;
        continue;
      }
      await prisma.lead.update({ where: { id: lead.id }, data: { lastEmailedAt: now } });
      report.sent++;
    } catch (e) {
      console.error(`[leads] follow-up failed for ${lead.id}:`, e);
      report.skipped++;
    }
  }
  return report;
}
