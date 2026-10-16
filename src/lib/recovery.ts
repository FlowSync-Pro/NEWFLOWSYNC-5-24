import { FLEET, FLEET_SMALL, LISTING_INCREASE_DATE_LABEL, LISTING_PRICE_AFTER, listingIncreasePending, listingPrice, premiumUpgradePrice } from "./pricing";
import { SITE_URL } from "./site";

// Ready-to-send follow-up messages. One source so the admin recovery page, the
// abandoned-checkout owner alert, and the recovery email all say the same
// true things: the current price, the REAL increase date while it's pending,
// Short, personal, one link, no fake urgency. The listing/Premium refund window
// is stated at checkout and on the refund policy — not pitched in texts
// (owner decision 2026-10-10).

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
// listing/Premium 7-day refund window. Never an income promise: it promises the REFUND.
const FLEET_HOOK =
  "Got a van, box truck or pickup + trailer? Join my Curri fleet: I bid the loads, you run the ones you want, paid every Friday.";
const FLEET_GUARANTEE = `Make your $${FLEET.price} back in your first ${FLEET.guaranteeDays} days or I refund all of it. No questions asked.`;
// The $197 small-vehicle ad page (FLEET_SMALL): its own hook, price and link.
const FLEET_SMALL_HOOK =
  "Drive a car, SUV, minivan, cargo van or pickup? Join my Curri fleet: I bid the loads, you run the ones you want, paid every Friday.";
const FLEET_SMALL_GUARANTEE = `Make your $${FLEET_SMALL.price} back in your first ${FLEET.guaranteeDays} days or I refund all of it. No questions asked.`;

/** A driver's personal fleet referral link — the same one their account's "Refer drivers" card shows (ReferralCard). */
export const fleetReferralLink = (code: string) => `${base()}/?ref=${code}#curri-fleet`;

/** SMS-length text the owner sends from his own phone. */
export function recoveryText(product: RecoveryProduct, firstName?: string | null, smallVehicle = false): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  if (product === "fleet" && smallVehicle) {
    return `${hi}Nas from FlowSync. ${FLEET_SMALL_HOOK}\n\n${FLEET_SMALL_GUARANTEE}\n\n${base()}${FLEET_SMALL.path}`;
  }
  if (product === "fleet") {
    return `${hi}Nas from FlowSync. ${FLEET_HOOK}\n\n${FLEET_GUARANTEE}\n\n${base()}/curri-fleet`;
  }
  // Listing — direct style (owner decision 2026-10-10), same shape as the fleet text.
  return (
    `${hi}Nas from FlowSync. You were one step from getting listed. ` +
    `Finish and customers can find you and book you directly, at the prices you set.\n\n` +
    `$${listingPrice()} one-time.\n\n` +
    `${base()}/pricing`
  );
}

/** Text for a driver who signed up free but never paid for the listing — direct style (owner decision 2026-10-10). */
export function unpaidSignupText(firstName?: string | null): string {
  const hi = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return (
    `${hi}Nas from FlowSync. You made an account, but customers can't find you yet. ` +
    `Get listed and they book you directly, at the prices you set.\n\n` +
    `$${listingPrice()} one-time.\n\n` +
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
    `$${premiumPrice} one-time.\n\n` +
    `${base()}/account/edit`
  );
}

// ---- The one follow-up ------------------------------------------------------
// Sent once, two days after the first text, only if they didn't reply — then
// stop (AGENTS.md section D). No discounts, no invented urgency.

/**
 * Fleet follow-up. `roomThisMonth` must come from real numbers — the admin
 * page compares this month's activations with FLEET.monthlyCap. It claims no
 * room; when the month is full it says so, because the buyer would start next
 * month (the guarantee's days count from activation, so they lose nothing).
 */
export function fleetFollowUpText(firstName: string | null | undefined, roomThisMonth: boolean, from: "public" | "account", smallVehicle = false): string {
  const link = smallVehicle ? `${base()}${FLEET_SMALL.path}` : from === "account" ? `${base()}/account/curri-fleet` : `${base()}/curri-fleet`;
  const price = smallVehicle ? FLEET_SMALL.price : FLEET.price;
  return (
    `${firstName ? `${firstName}, ` : "Hey, "}Nas again, last one from me. ` +
    `If the fleet doesn't pay for itself in your first ${FLEET.guaranteeDays} days, I refund the $${price}. You can't lose. ` +
    (roomThisMonth ? "" : "This month's spots are full, so you'd start next month. ") +
    link
  );
}

/**
 * The reply email for someone who abandoned a fleet checkout and then WROTE
 * BACK with questions (owner request 2026-10-16): how the fleet works start to
 * finish, the make-it-back guarantee, and what happens step by step after they
 * pay. Plain text so it copies cleanly into any mail app. It promises the
 * REFUND, never earnings (AGENTS.md sections D–E). `roomThisMonth` must come
 * from real numbers (this month's activations vs FLEET.monthlyCap).
 */
export function fleetReplyEmail(firstName: string | null | undefined, roomThisMonth: boolean, smallVehicle = false): { subject: string; body: string } {
  const price = smallVehicle ? FLEET_SMALL.price : FLEET.price;
  const link = smallVehicle ? `${base()}${FLEET_SMALL.path}` : `${base()}/curri-fleet#join`;
  const days = FLEET.guaranteeDays;
  const keep = 100 - FLEET.dispatchFeePercent;
  const lines = [
    `Hey ${firstName?.trim() || "there"},`,
    "",
    "Thanks for getting back to me. Here's exactly how the fleet works, start to finish, so you know what you're getting before you pay a dollar.",
    "",
    "WHAT IT IS",
    "You run Curri loads on my carrier account (Barham Transport) instead of waiting months for your own approval. I bid the loads, you get offers on your phone, and you only run the ones you want.",
    "",
    "THE DIFFERENCE BIDDING MAKES",
    `A gig account claims a load at the listed price. We place bids instead. One real example: a load posted at $100.45. We bid $300 and won it. On the way there, the app texted a gig driver $145 for the same pallet, same pickup, same drop-off. That's one load, not a promise. Every load is different and bids don't always win. But it's why keeping ${keep}% of a $300 load beats keeping all of a $145 one.`,
    "",
    "WHAT IT COSTS",
    `- $${price} one-time. No monthly fee, no insurance charge.`,
    `- ${FLEET.dispatchFeePercent}% dispatching fee, only on loads we bring you. No loads that week, no fee that week.`,
    `- Want your pay sooner? Payment in 1-2 business days is ${FLEET.fastPayoutFeePercent}%. Standard pay is every Friday.`,
    "- Prefer to pay over time? Klarna, Afterpay or Affirm at checkout, if you're eligible.",
    ...(smallVehicle
      ? ["- This price is for sedans, SUVs, minivans, cargo vans and pickups. At activation I confirm the vehicle; a box truck, Sprinter or pickup + trailer pays the difference or gets a full refund."]
      : []),
    "",
    "MAKE IT BACK OR GET IT BACK",
    `Make your $${price} back in your first ${days} days or I refund all of it. No questions asked.`,
    "- Before you're activated, it's fully refundable anytime.",
    `- After activation, if your take-home from fleet loads in your first ${days} days (after the dispatching fee, from my payout records) adds up to less than the $${price}, email me or text me within ${FLEET.guaranteeClaimDays} days after and I refund it in full. Nothing to prove. A refund ends your fleet membership.`,
    "- The one exception: two violations on the carrier account means removal from the fleet with no refund, because violations put every driver on the account at risk.",
    "",
    "STEP BY STEP, AFTER YOU PAY",
    "1. Right away: your FlowSync account is created and you get a welcome email with your sign-in. Everything in Premium is unlocked: the bidding calculator, the P&L tracker, every guide, and the Curri mastermind course.",
    `2. Reply to that email with your city, your vehicle (year, make, model), and standard pay (Fridays, ${FLEET.dispatchFeePercent}%) or faster pay (1-2 business days, ${FLEET.fastPayoutFeePercent}%).`,
    "3. I add you to the carrier account myself, usually the same day I have your details. That's your activation.",
    "4. Set up payouts (about 5 minutes): in your account, open Payouts and fill in Stripe's short form. Your bank details go to Stripe, not to me. That's where every payout lands, and where your 1099 comes from at year end.",
    "5. Connect Telegram with one tap from your fleet page (the app is free), and join the fleet driver group.",
    "6. Go Active when you want loads: one tap on your fleet page, or send /active to the FlowSync bot. Active turns itself off after your hours, so you're never woken up at 2 AM.",
    "7. Offers come to your phone: pickup, drop-off, miles and your take-home pay, with Accept and Pass. Offers go to the nearest Active drivers, and the first to accept gets the load. Pass on anything that doesn't suit you. Once you accept, I claim or bid it in Curri, so only accept loads you'll run.",
    `8. Run the load, then get paid every Friday through Stripe (or in 1-2 business days on faster pay).`,
    "",
    "WHAT I CAN'T PROMISE",
    `How many loads you'll get. It depends on your market and how often you're Active. I take on a limited number of new drivers each month so each one gets real dispatch support. ${
      roomThisMonth
        ? "There's still room this month."
        : "This month is full, so you'd be first in line for next month, fully refundable until you're activated."
    }`,
    "",
    `Ready? Grab your spot here: ${link}`,
    "",
    "Questions first? Just reply. It's me reading these, not a bot.",
    "",
    "- Nas Barham",
    "Barham Transport / FlowSync Drivers",
    "",
    "FlowSync and Barham Transport LLC are independent and are not owned by, affiliated with, or part of Curri. Fleet drivers are independent contractors. No guarantee of load volume or earnings.",
  ];
  return { subject: "Re: your Curri fleet spot", body: lines.join("\n") };
}

/** Follow-up for an abandoned listing checkout — direct style (owner decision 2026-10-10). */
export function listingFollowUpText(firstName?: string | null): string {
  return (
    `${firstName ? `${firstName}, ` : "Hey, "}Nas again, last one from me. ` +
    `Your listing is one step away, $${listingPrice()} one-time: ${base()}/pricing`
  );
}

/** Follow-up for a free signup who never got listed — direct style (owner decision 2026-10-10). */
export function unpaidFollowUpText(firstName?: string | null): string {
  return (
    `${firstName ? `${firstName}, ` : "Hey, "}Nas again, last one from me. ` +
    `Your account's done. Getting listed is the last step so customers can find you, $${listingPrice()} one-time: ${base()}/pricing`
  );
}

/** Follow-up for a Verified driver who hasn't upgraded. */
/** Follow-up for a Verified driver who hasn't upgraded — direct style (owner decision 2026-10-10). */
export function premiumFollowUpText(firstName?: string | null, premiumPrice = premiumUpgradePrice()): string {
  return (
    `${firstName ? `${firstName}, ` : "Hey, "}Nas again, last one from me. ` +
    `Premium is the business side of your listing: the bidding calculator (your floor and your bid on every load), the P&L tracker, and my Curri course. ` +
    `$${premiumPrice} one-time: ${base()}/account/edit`
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
