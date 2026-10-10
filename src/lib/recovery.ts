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

// Fleet texts (owner decision 2026-10-09): short and direct, one hook, one
// guarantee, one link — nothing to think over. The guarantee is the fleet's own
// (FLEET.refundShort; full terms on /refund-policy and at checkout), not the
// listing's 30-day one. Never an income promise: it promises the REFUND.
const FLEET_HOOK =
  "Got a van, box truck or pickup + trailer? Join my Curri fleet: I bid the loads, you run the ones you want, paid every Friday.";
const FLEET_GUARANTEE = `Make your $${FLEET.price} back in your first ${FLEET.guaranteeDays} days or I refund all of it. No questions asked.`;

/** A driver's personal fleet referral link — the same one their account's "Refer drivers" card shows (ReferralCard). */
export const fleetReferralLink = (code: string) => `${base()}/?ref=${code}#curri-fleet`;

/** SMS-length text the owner sends from his own phone. */
export function recoveryText(product: RecoveryProduct, firstName?: string | null): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  if (product === "fleet") {
    return `${hi}Nas from FlowSync. ${FLEET_HOOK}\n\n${FLEET_GUARANTEE}\n\n${base()}/curri-fleet`;
  }
  return (
    `${hi}it's Nas from FlowSync. You started your driver listing but didn't finish. ` +
    `Here's the link to pick it back up: ${base()}/pricing — ${listingPriceLine()} ` +
    `${GUARANTEE_DAYS}-day money-back either way. Reply here if you have questions.`
  );
}

/** Text for a driver who signed up free but never paid for the listing — direct style (owner decision 2026-10-10). */
export function unpaidSignupText(firstName?: string | null): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return (
    `${hi}Nas from FlowSync. You made an account, but customers can't find you yet. ` +
    `Get listed and they book you directly, at the prices you set.\n\n` +
    `$${listingPrice()} one-time. ${GUARANTEE_DAYS}-day money-back, no questions asked.\n\n` +
    `${base()}/pricing`
  );
}

/** Text for a paid driver who isn't in the Curri fleet. */
export function fleetPitchText(firstName?: string | null): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return `${hi}Nas from FlowSync. ${FLEET_HOOK}\n\n${FLEET_GUARANTEE}\n\nJoin from your account: ${base()}/account/curri-fleet`;
}

/** Text for a Verified driver who hasn't upgraded to Premium — direct style (owner decision 2026-10-10). */
export function premiumPitchText(firstName?: string | null, premiumPrice = premiumUpgradePrice()): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return (
    `${hi}Nas from FlowSync. Want to know what a load is worth before you take it? ` +
    `Premium gives you the bidding calculator (your floor and your bid on every load), the P&L tracker with your cost per mile, and my Curri course.\n\n` +
    `$${premiumPrice} one-time. ${GUARANTEE_DAYS}-day money-back, no questions asked.\n\n` +
    `${base()}/account/edit`
  );
}

// ---- The one follow-up ------------------------------------------------------
// Sent once, two days after the first text, only if they didn't reply — then
// stop (AGENTS.md section D). No discounts, no invented urgency.

const lastOne = (firstName?: string | null) => `${firstName ? `Hey ${firstName}, ` : "Hey, "}Nas again from FlowSync — last one from me on this. `;

/**
 * Fleet follow-up. `roomThisMonth` must come from real numbers — the admin
 * page compares this month's activations with FLEET.monthlyCap. It claims no
 * room; when the month is full it says so, because the buyer would start next
 * month (the guarantee's days count from activation, so they lose nothing).
 */
export function fleetFollowUpText(firstName: string | null | undefined, roomThisMonth: boolean, from: "public" | "account"): string {
  const link = from === "account" ? `${base()}/account/curri-fleet` : `${base()}/curri-fleet`;
  return (
    `${firstName ? `${firstName}, ` : "Hey, "}Nas again, last one from me. ` +
    `If the fleet doesn't pay for itself in your first ${FLEET.guaranteeDays} days, I refund the $${FLEET.price}. You can't lose. ` +
    (roomThisMonth ? "" : "This month's spots are full, so you'd start next month. ") +
    link
  );
}

/** Follow-up for an abandoned listing checkout. */
export function listingFollowUpText(firstName?: string | null): string {
  return lastOne(firstName) + `Your driver listing is still waiting: ${base()}/pricing — ${listingPriceLine()} ${GUARANTEE_DAYS}-day money-back. If now's not the time, no worries.`;
}

/** Follow-up for a free signup who never got listed. */
export function unpaidFollowUpText(firstName?: string | null): string {
  return lastOne(firstName) + `Your account's set up — getting listed is the last step so customers can find you: ${base()}/pricing — ${listingPriceLine()} ${GUARANTEE_DAYS}-day money-back. If now's not the time, no worries.`;
}

/** Follow-up for a Verified driver who hasn't upgraded. */
/** Follow-up for a Verified driver who hasn't upgraded — direct style (owner decision 2026-10-10). */
export function premiumFollowUpText(firstName?: string | null, premiumPrice = premiumUpgradePrice()): string {
  return (
    `${firstName ? `${firstName}, ` : "Hey, "}Nas again, last one from me. ` +
    `Premium is the business side of your listing: the bidding calculator (your floor and your bid on every load), the P&L tracker, and my Curri course. ` +
    `$${premiumPrice} one-time, ${GUARANTEE_DAYS}-day money-back, no questions asked. ${base()}/account/edit`
  );
}

// ---- Referrals --------------------------------------------------------------

/**
 * Ask a fleet driver to refer drivers. `link` is their EXISTING personal fleet
 * link (never created here — codes are made when they open their account), or
 * null, in which case the text points them to it. The bonus terms are the
 * ReferralCard's: new to FlowSync, signs up through the link, joins the fleet,
 * paid once activated — and the share line discloses the bonus (FTC).
 */
export function referralAskText(firstName: string | null | undefined, link: string | null, activated: boolean): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return (
    `${hi}it's Nas. ${activated ? "Thanks for running with the fleet." : "Thanks for joining the fleet."} Know any drivers who'd want loads dispatched to them? ` +
    `If someone joins the fleet through your link, I'll send you $${FLEET.referralBonus} once they're activated on the carrier account (they need to be new to FlowSync and sign up through your link). ` +
    (link ? `Your link: ${link} ` : `Your personal link is in your account under "Refer drivers": ${base()}/account `) +
    `— if you share it, just mention you get a bonus if they join.`
  );
}

// ---- Paid, can't get in -------------------------------------------------------
// Support texts, not sales: these people already paid. No follow-up.

/** Paid in Stripe but the site never recorded it — the owner is fixing it (Resend in Stripe). */
export function paidNotRecordedText(firstName: string | null | undefined, existingAccount: boolean, what: string): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return existingAccount
    ? `${hi}it's Nas from FlowSync — got your payment for the ${what}, thank you! It isn't showing on your account yet; I'm fixing that now and will text you when it's done. Sorry for the wait.`
    : `${hi}it's Nas from FlowSync — got your payment, thank you! Your account is still being set up on our side. You'll get an email with your login shortly — sorry for the wait. Reply here with any questions.`;
}

/** Paid and the account exists, but they never set their own password (still on the temporary one). */
export function stuckNoPasswordText(firstName: string | null | undefined, email: string): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return (
    `${hi}it's Nas from FlowSync — your payment came through, but it looks like you haven't gotten into your account yet. ` +
    `Go to ${base()}/forgot-password, enter ${email}, and you'll get a link to set your password (check spam for an email from FlowSync). Text me if it doesn't come.`
  );
}

/** Paid and signed in, but never finished setup — their listing isn't live. */
export function unfinishedSetupText(firstName?: string | null): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return (
    `${hi}it's Nas from FlowSync — thanks for joining! Your listing isn't live yet because your profile isn't finished. ` +
    `Sign in at ${base()}/signin and add your name and the service you offer (about 2 minutes). Reply here if anything's in the way.`
  );
}
