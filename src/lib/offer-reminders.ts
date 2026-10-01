import { OFFER_WINDOW_HOURS } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";
import { offerClosingEmail } from "@/lib/email";
import { cancelMarketing, sendMarketing } from "@/lib/marketing";

// M1 — "offer closing soon" (owner-approved 2026-10-01). Scheduled with Resend
// at the moment of a Verified purchase, for 20 hours later (about 4 hours
// before the 24h offers close), and cancelled if the driver buys Premium or
// joins the fleet first, is refunded, or unsubscribes. lib/marketing.ts still
// decides whether they may get it at all (opt-out, refunds, admins, fleet,
// once-ever, 48h gap) and adds the legal footer.
//
// Both functions never throw: a reminder must never break a purchase.

export const M1_KIND = "m1-offer-closing";
export const M1_HOURS_AFTER_PURCHASE = 20;

export async function scheduleOfferClosingReminder(opts: {
  userId: string;
  firstName: string;
  /** The paid listing session — the offer pages identify the buyer by it. */
  listingSessionId: string;
  purchasedAt: Date;
}): Promise<void> {
  try {
    const sendAt = new Date(opts.purchasedAt.getTime() + M1_HOURS_AFTER_PURCHASE * 3_600_000);
    // If this webhook ran very late, it's too close to the deadline to be useful.
    if (sendAt.getTime() < Date.now() + 10 * 60_000) return;
    const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
    const sid = encodeURIComponent(opts.listingSessionId);
    const email = offerClosingEmail({
      firstName: opts.firstName,
      hoursLeft: OFFER_WINDOW_HOURS - M1_HOURS_AFTER_PURCHASE,
      premiumUrl: `${base}/welcome/premium-offer?session_id=${sid}`,
      fleetUrl: `${base}/welcome/fleet-offer?session_id=${sid}`,
    });
    const r = await sendMarketing({ userId: opts.userId, kind: M1_KIND, ...email, scheduledAt: sendAt, excludeFleet: true });
    if (!r.sent) console.log(`[m1] not scheduled for ${opts.userId}: ${r.reason}`);
  } catch (e) {
    console.error("[m1] scheduling failed (the purchase itself is fine):", e);
  }
}

export async function cancelOfferClosingReminder(userId: string): Promise<void> {
  try {
    await cancelMarketing(userId, M1_KIND);
  } catch (e) {
    console.error("[m1] cancel failed:", e);
  }
}
