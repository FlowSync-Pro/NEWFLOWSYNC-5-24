import { FLEET, LISTING_INCREASE_DATE_LABEL, LISTING_PRICE_AFTER, listingIncreasePending, listingPrice, GUARANTEE_DAYS, premiumUpgradePrice } from "./pricing";
import { SITE_URL } from "./site";

// Ready-to-send follow-up messages. One source so the admin recovery page, the
// abandoned-checkout owner alert, and the recovery email all say the same
// true things: the current price, the REAL increase date while it's pending,
// and the 30-day guarantee. Short, personal, one link, no fake urgency.

export type RecoveryProduct = "listing" | "fleet";

const base = () => process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;

/** The honest one-liner about the listing price, used everywhere. */
export function listingPriceLine(): string {
  return listingIncreasePending()
    ? `It's $${listingPrice()} until ${LISTING_INCREASE_DATE_LABEL}, then it goes to $${LISTING_PRICE_AFTER}.`
    : `It's $${listingPrice()} one-time.`;
}

// The fleet is NOT covered by the 30-day guarantee (AGENTS.md §D): it's
// refundable until activation, then earned. Same terms as FLEET.refundShort.
const FLEET_REFUND_TEXT = "fully refundable until you're activated on our carrier account, then non-refundable";

/** SMS-length text the owner sends from his own phone. */
export function recoveryText(product: RecoveryProduct, firstName?: string | null): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  if (product === "fleet") {
    return (
      `${hi}it's Nas from FlowSync. You started joining the fleet but didn't finish. ` +
      `Here's the link to pick it back up: ${base()}/#curri-fleet — $${FLEET.price} one-time, ${FLEET_REFUND_TEXT}. ` +
      `Reply here if you have questions.`
    );
  }
  return (
    `${hi}it's Nas from FlowSync. You started your driver listing but didn't finish. ` +
    `Here's the link to pick it back up: ${base()}/pricing — ${listingPriceLine()} ` +
    `${GUARANTEE_DAYS}-day money-back either way. Reply here if you have questions.`
  );
}

/** Text for a driver who signed up free but never paid for the listing. */
export function unpaidSignupText(firstName?: string | null): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return (
    `${hi}it's Nas from FlowSync. You made an account but never got listed, so customers can't find you yet. ` +
    `${listingPriceLine()} Get listed here: ${base()}/pricing — ${GUARANTEE_DAYS}-day money-back. Reply if you're stuck on anything.`
  );
}

/** Text for a paid driver who isn't in the Curri fleet. */
export function fleetPitchText(firstName?: string | null): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return (
    `${hi}it's Nas. Quick one: I'm adding drivers to my Curri carrier account this week. ` +
    `I bid the loads (we just took a $300 load that a gig driver ran for $145), you run the ones you want, paid every Friday, ${FLEET.dispatchFeePercent}% dispatch fee, no monthly. ` +
    `$${FLEET.price} one-time to join, ${FLEET_REFUND_TEXT}. Sign in and open "Curri fleet" in your account: ${base()}/account/curri-fleet — or reply and I'll walk you through it.`
  );
}

/** Text for a Verified driver who hasn't upgraded to Premium. */
export function premiumPitchText(firstName?: string | null, premiumPrice = premiumUpgradePrice()): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return (
    `${hi}it's Nas from FlowSync. Quick one: Premium is now the business side of your listing — the bidding calculator (your floor and your bid on every load), ` +
    `the P&L tracker with cost per mile, the ads guide, and my Curri mastermind course, plus the badge and top placement in the directory. ` +
    `$${premiumPrice} one-time to upgrade, ${GUARANTEE_DAYS}-day money-back. Sign in, go to Edit profile, tap Upgrade to Premium: ${base()}/account/edit — or reply "premium" and I'll send the link.`
  );
}
