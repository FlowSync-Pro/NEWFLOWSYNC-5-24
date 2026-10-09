import { prisma } from "@/lib/db";
import { sendMarketing, MARKETING_GAP_HOURS } from "@/lib/marketing";
import { isAdminEmail } from "@/lib/admin";
import { FLEET } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

// One-time "Join the Curri fleet" email to paid drivers who aren't in the fleet
// yet, sent from /admin/fleet-invite in batches — the same pattern as the
// add-city email (src/lib/add-city-email.ts). Goes through sendMarketing(), so:
// skips unsubscribed, refunded, admin accounts and fleet members, once per
// driver (EmailLog kind below), 48h gap from other marketing email, unsubscribe
// link and postal footer added for you. Every price and term comes from
// lib/pricing.ts (AGENTS.md §D): $297 one-time, the 15% / 20% fee, the
// refund-until-activated rule, the monthly cap. Never the offer-page prices.

export const FLEET_INVITE_KIND = "fleet-invite-2026-10";
/** Per click: 40 × (SEND_GAP_MS + a DB round trip) stays inside the page's 60s maxDuration. */
export const FLEET_INVITE_BATCH = 40;
/** Resend allows 2 requests/second; a burst of sends gets every one after the first refused. */
const SEND_GAP_MS = 600;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const P = `style="color:#aebac1;line-height:1.65;margin:0 0 14px"`;
const LI = `style="color:#aebac1;line-height:1.6;margin:0 0 8px"`;
const SMALL = `style="color:#7d8a91;font-size:12px;line-height:1.6;margin:0 0 10px"`;
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function fleetInviteEmail(firstName: string): { subject: string; heading: string; body: string } {
  const join = `${SITE_URL}/account/curri-fleet`;
  const proof = `${SITE_URL}/curri-fleet`;
  return {
    subject: "Want loads sent to your phone? (Curri fleet)",
    heading: "Join the FlowSync Curri fleet",
    body: `
    <p ${P}>Hi ${esc(firstName || "there")},</p>
    <p ${P}>You're already a FlowSync driver, so I wanted you to hear this from me first. I run a carrier account on Curri (under Barham Transport), and I'm adding drivers to run the loads we bid on.</p>
    <p ${P}><strong style="color:#e8eef1">How it works</strong></p>
    <ul style="padding-left:20px;margin:0 0 14px">
      <li ${LI}>A load near you comes in, and the offer goes to your phone on Telegram (and your FlowSync account) with the pay shown up front.</li>
      <li ${LI}>You tap Accept or Pass. First to accept gets it. No forced loads. Car, SUV, minivan, pickup, cargo van, Sprinter or box truck — offers match your vehicle.</li>
      <li ${LI}>Paid every Friday through Stripe. ${FLEET.dispatchFeePercent}% dispatching fee, taken from the load (${FLEET.fastPayoutFeePercent}% if you want it in 1–2 business days). No monthly fee, no insurance charge.</li>
    </ul>
    <p ${P}><strong style="color:#e8eef1">Why a carrier account.</strong> Gig accounts wait to be offered a load at the listed price. We bid. A real one from our own week: a load was posted at $100.45 and we bid $300 and won it, while the app was texting a gig driver $145 for the same job. That's one load, not a promise — every load is different, bids don't always win, and how many loads come up depends on your market.</p>
    <p ${P}><strong style="color:#e8eef1">What it costs.</strong> $${FLEET.price} one-time. It includes everything in Premium — the bidding calculator, the P&amp;L tracker, the ads guide and my Curri mastermind course. You can split it into payments at checkout (Klarna, Afterpay or Affirm, if you're eligible).</p>
    <p ${P}><strong style="color:#e8eef1">Refund.</strong> ${esc(FLEET.refundShort)} Two violations on the carrier account means removal from the fleet without a refund.</p>
    <p ${P}><strong style="color:#e8eef1">Activation.</strong> I activate every driver myself — usually the same day once you send me your city and vehicle. I take on up to ${FLEET.monthlyCap} new fleet drivers a month; if this month's spots are taken when you join, you're first in line for next month, and your fee stays refundable until you're activated.</p>
    <p style="margin:0 0 6px"><a href="${join}" style="display:inline-block;background:#25e07a;color:#04130a;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:999px;margin-top:8px">Join from my account →</a></p>
    <p ${P}>Sign in, and you'll see "Join the fleet" on that page. Want to see real runs first? <a href="${proof}" style="color:#25e07a">Here are loads our drivers ran</a>.</p>
    <p ${P}>Questions? Reply to this email — I read every one.</p>
    <p ${P}>Nasser<br>FlowSync Drivers</p>
    <p ${SMALL}>Operated by Barham Transport LLC. FlowSync and Barham Transport are independent and are not owned by, affiliated with, or part of Curri. Fleet drivers are independent contractors, paid through Stripe Connect with a 1099 at year end. No guarantee of load volume or earnings.</p>`,
  };
}

export interface FleetInviteRecipient {
  userId: string;
  firstName: string;
}

/** A vehicle type that can't run a Curri load (the profile's "Bike / scooter"). Unset is kept. */
const cantRunCurri = (vehicleType: string | null | undefined) => /^(bike|scooter)/i.test((vehicleType ?? "").trim());

/**
 * Paid, non-refunded, non-fleet drivers who haven't had this email and are
 * free of the 48h marketing gap right now (sendMarketing re-checks all of it).
 * Drivers held back by the gap are left out here instead of being skipped in a
 * batch, so they can't fill the front of the queue; they come back on their own.
 */
export async function fleetInviteAudience(): Promise<FleetInviteRecipient[]> {
  const gapStart = new Date(Date.now() - MARKETING_GAP_HOURS * 3_600_000);
  const users = await prisma.user.findMany({
    where: {
      role: "DRIVER",
      fleetJoinedAt: null,
      marketingOptOutAt: null,
      payments: { some: { status: "PAID" }, none: { status: "REFUNDED" } },
      emailLogs: {
        none: {
          cancelledAt: null,
          OR: [{ kind: FLEET_INVITE_KIND }, { sentAt: { gte: gapStart } }, { scheduledFor: { gte: gapStart } }],
        },
      },
    },
    select: { id: true, email: true, name: true, driverProfile: { select: { firstName: true, vehicleType: true } } },
    orderBy: { createdAt: "asc" },
  });
  return users
    .filter((u) => !isAdminEmail(u.email) && !cantRunCurri(u.driverProfile?.vehicleType))
    .map((u) => ({ userId: u.id, firstName: u.driverProfile?.firstName || u.name?.split(" ")[0] || "" }));
}

/** How many have had it already (for the page's progress line). */
export function fleetInviteSentCount(): Promise<number> {
  return prisma.emailLog.count({ where: { kind: FLEET_INVITE_KIND, cancelledAt: null } });
}

export interface FleetInviteBatchResult {
  sent: number;
  skipped: number;
  /** Why sendMarketing held some back, e.g. { "unsubscribed": 1 }. */
  reasons: Record<string, number>;
  /** Ready to send after this batch. */
  remaining: number;
}

export async function sendFleetInviteBatch(limit = FLEET_INVITE_BATCH): Promise<FleetInviteBatchResult> {
  const audience = await fleetInviteAudience();
  const batch = audience.slice(0, limit);
  const result: FleetInviteBatchResult = { sent: 0, skipped: 0, reasons: {}, remaining: 0 };
  for (const [i, r] of batch.entries()) {
    if (i > 0) await sleep(SEND_GAP_MS);
    try {
      const res = await sendMarketing({ userId: r.userId, kind: FLEET_INVITE_KIND, excludeFleet: true, ...fleetInviteEmail(r.firstName) });
      if (res.sent) result.sent++;
      else {
        result.skipped++;
        const why = res.reason ?? "not sent";
        result.reasons[why] = (result.reasons[why] ?? 0) + 1;
      }
    } catch (e) {
      // One driver's bad data must not stop the batch.
      console.error(`[fleet-invite] failed for ${r.userId}:`, e);
      result.skipped++;
      result.reasons.error = (result.reasons.error ?? 0) + 1;
    }
  }
  result.remaining = (await fleetInviteAudience()).length;
  return result;
}
