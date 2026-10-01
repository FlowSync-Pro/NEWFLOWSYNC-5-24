import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { MARKETING_POSTAL_ADDRESS, SITE_URL, SUPPORT_EMAIL } from "@/lib/site";
import { cancelScheduledEmail, sendMarketingEmail } from "@/lib/email";

// Marketing email groundwork (fix 7). Every marketing email goes through
// sendMarketing() below, which enforces, in one place:
//  - nothing goes out until the postal address for the legal footer is set;
//  - never to drivers who unsubscribed, were refunded, or are admins/the owner;
//  - optionally never to fleet members (no Premium or fleet pitches to them);
//  - each follow-up ("kind") at most once per driver (EmailLog unique row);
//  - at most one marketing email per driver in any 48 hours.
// Transactional email (receipts, sign-in, approvals) never comes through here.

export const MARKETING_GAP_HOURS = 48;

/** Marketing email is switched off until the footer's postal address is filled in. */
export function marketingEnabled(): boolean {
  return MARKETING_POSTAL_ADDRESS.trim().length > 0;
}

// ---- One-click unsubscribe links ------------------------------------------
// Token `<userId>.<sig>`, sig = HMAC-SHA256(AUTH_SECRET, "unsubscribe:<userId>").
// No expiry on purpose: an unsubscribe link must keep working forever. The
// "unsubscribe:" prefix keeps it from ever passing as a session or invite.

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}
const sign = (userId: string) => createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("base64url");

export function unsubscribeToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** The user id a token was issued for, or null if it's malformed or forged. */
export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const a = Buffer.from(token.slice(dot + 1));
  const b = Buffer.from(sign(userId));
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}

export function unsubscribeUrl(userId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  return `${base}/api/unsubscribe?t=${encodeURIComponent(unsubscribeToken(userId))}`;
}

/** Opt a user out of marketing email and cancel anything already scheduled. Idempotent. */
export async function optOutOfMarketing(userId: string): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId, marketingOptOutAt: null }, data: { marketingOptOutAt: new Date() } });
  const pending = await prisma.emailLog.findMany({
    where: { userId, cancelledAt: null, resendId: { not: null }, scheduledFor: { gt: new Date() } },
  });
  for (const log of pending) {
    if (await cancelScheduledEmail(log.resendId!)) {
      await prisma.emailLog.update({ where: { id: log.id }, data: { cancelledAt: new Date() } });
    }
  }
}

// ---- Who may get a marketing email ----------------------------------------

export type Eligibility = { ok: true; email: string } | { ok: false; reason: string };

export async function marketingEligibility(
  userId: string,
  kind: string,
  opts: { excludeFleet?: boolean; at?: Date } = {},
): Promise<Eligibility> {
  const at = opts.at ?? new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      role: true,
      marketingOptOutAt: true,
      fleetJoinedAt: true,
      payments: { where: { status: "REFUNDED" }, select: { id: true }, take: 1 },
      emailLogs: { where: { cancelledAt: null }, select: { kind: true, sentAt: true, scheduledFor: true } },
    },
  });
  if (!user) return { ok: false, reason: "no such user" };
  if (user.marketingOptOutAt) return { ok: false, reason: "unsubscribed" };
  if (user.role === "ADMIN" || isAdminEmail(user.email) || user.email.toLowerCase() === SUPPORT_EMAIL) {
    return { ok: false, reason: "admin or owner account" };
  }
  if (user.payments.length > 0) return { ok: false, reason: "refunded" };
  if (opts.excludeFleet && user.fleetJoinedAt) return { ok: false, reason: "fleet member" };
  if (user.emailLogs.some((l) => l.kind === kind)) return { ok: false, reason: "already sent" };
  const gapMs = MARKETING_GAP_HOURS * 3_600_000;
  const tooClose = user.emailLogs.some((l) => Math.abs((l.scheduledFor ?? l.sentAt).getTime() - at.getTime()) < gapMs);
  if (tooClose) return { ok: false, reason: `another marketing email within ${MARKETING_GAP_HOURS}h` };
  return { ok: true, email: user.email };
}

// ---- Send (or schedule) one marketing email -------------------------------

export interface MarketingEmail {
  userId: string;
  /** Stable id of the follow-up, e.g. "m1-finish-setup". One per driver, ever. */
  kind: string;
  subject: string;
  heading: string;
  /** Inner HTML (same styles as the other emails). The legal footer is added for you. */
  body: string;
  /** Deliver later instead of now (Resend scheduling). */
  scheduledAt?: Date;
  /** Skip fleet members (anything pitching Premium or the fleet). */
  excludeFleet?: boolean;
}

export async function sendMarketing(m: MarketingEmail): Promise<{ sent: boolean; reason?: string }> {
  if (!marketingEnabled()) return { sent: false, reason: "marketing email is off (no postal address set)" };
  const elig = await marketingEligibility(m.userId, m.kind, { excludeFleet: m.excludeFleet, at: m.scheduledAt });
  if (!elig.ok) return { sent: false, reason: elig.reason };

  // Claim the (user, kind) slot BEFORE sending, so two runs can never both send it.
  let logId: string;
  try {
    const log = await prisma.emailLog.create({ data: { userId: m.userId, kind: m.kind, scheduledFor: m.scheduledAt ?? null } });
    logId = log.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { sent: false, reason: "already sent" };
    throw e;
  }

  const res = await sendMarketingEmail({
    to: elig.email,
    subject: m.subject,
    heading: m.heading,
    body: m.body,
    unsubscribeUrl: unsubscribeUrl(m.userId),
    postalAddress: MARKETING_POSTAL_ADDRESS,
    scheduledAt: m.scheduledAt?.toISOString(),
  });
  if (!res.sent) {
    // Nothing went out, so release the slot (this row is our own bookkeeping,
    // not driver data) and let a later run try again.
    await prisma.emailLog.delete({ where: { id: logId } });
    return { sent: false, reason: res.reason ?? "failed" };
  }
  if (res.id) await prisma.emailLog.update({ where: { id: logId }, data: { resendId: res.id } });
  return { sent: true };
}

/** Cancel a still-scheduled follow-up (e.g. the driver bought before it went out). */
export async function cancelMarketing(userId: string, kind: string): Promise<boolean> {
  const log = await prisma.emailLog.findUnique({ where: { userId_kind: { userId, kind } } });
  if (!log || log.cancelledAt || !log.resendId || !log.scheduledFor || log.scheduledFor <= new Date()) return false;
  if (!(await cancelScheduledEmail(log.resendId))) return false;
  await prisma.emailLog.update({ where: { id: log.id }, data: { cancelledAt: new Date() } });
  return true;
}
