export interface Bump {
  id: string;
  price: number;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  badge?: string;
}

export const CORE_OFFER = {
  id: "listing",
  price: 17,
  name: "FlowSync Driver Listing",
  cadence: "one-time",
  tagline: "Get listed in the driver directory and start taking direct bookings.",
  features: [
    "Listed in the FlowSync driver directory",
    "Direct customer bookings — no middleman",
    "Direct customer bookings — you set the price",
    "A service-matched profile page",
    "Fair-quote calculator to price every job",
    "Set your own rates and schedule",
  ],
};

export const PLATFORM_FEE_PERCENT = 10;

export type TierId = "standard" | "premium";

export interface Tier {
  id: TierId;
  price: number;
  name: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

// The ladder (funnel v2, launched with LEGACY_CUTOVER_AT below):
//   Tier 1 "Verified"  — listingPrice(): $47 (the $17 entry price ended 2026-09-29).
//                        Listing + service menu + the setup guides below.
//   Tier 2 "Premium"   — $97 one-time. Everything in Verified + the business
//                        tools + the ads guide + the Curri mastermind course +
//                        badge / priority placement / website link.
//   Tier 3 "Curri fleet" — FLEET below ($297; $197 only on the post-checkout
//                        offer page). Includes done-for-you setup.
// Drivers who paid before the cutover keep everything they had (lib/access.ts).
export const TIERS: Record<TierId, Tier> = {
  standard: {
    id: "standard",
    // $47 as of 2026-09-29 (owner decision: the $17 entry price brought signups
    // but no profit). The dated-increase mechanism below is kept, with its date
    // in the past, so nothing on the site advertises a pending increase.
    price: 47,
    // Display name only — the internal id stays "standard" and the DB enum
    // stays STANDARD (id and enum are stable contracts). "Verified" pairs with
    // Premium without sounding like a baseline/lesser tier.
    name: "Verified",
    tagline: "Get listed, and get set up as a real carrier — not a gig driver.",
    features: [
      "Driver directory listing, plus your own service menu with custom pricing",
      "How to get your USDOT number free — no filing service",
      "How to get your EIN free — no filing service",
      "How to file an LLC for your delivery business",
      "Medical courier requirements and licenses",
      "Sign up with Curri & Dispatch as a carrier, not a gig driver — and why it matters",
    ],
  },
  premium: {
    id: "premium",
    price: 97,
    name: "Premium",
    tagline: "Everything in Verified, plus the tools and the training to run it like a business.",
    highlight: true,
    features: [
      "Everything in Verified",
      "Bidding calculator — know your break-even and what to bid on every load",
      "Profit & Loss business tracker — business and personal expenses, cost per mile, rate per mile, net income weekly / monthly / quarterly",
      "How to run an ad for your delivery business",
      "Curri mastermind course",
      "Premium badge, priority placement in the directory, and your own website link",
    ],
  },
};

/** Guides included in Tier 1 (Verified). Premium, fleet, and legacy buyers get all guides. */
export const TIER1_GUIDE_SLUGS = [
  "get-dot-and-ein-free",
  "llc-sole-prop-or-dba",
  "medical-courier-requirements",
  "sign-up-as-a-carrier-curri-dispatch",
] as const;

/**
 * Funnel v2 launch moment. Any driver whose first paid purchase is BEFORE this
 * keeps every guide and tool they had under the old $17 offer, forever. Set
 * to the merge time of the launch deploy (a little late is fine — it only
 * means a few new buyers get extra access; early would take things away).
 */
export const LEGACY_CUTOVER_AT = new Date("2026-09-29T16:45:00Z");

export function getTier(id: TierId): Tier {
  return TIERS[id];
}

/**
 * A REAL, dated price increase for the listing. Until the moment below the site
 * shows and charges TIERS.standard.price ($17) and says when it goes up; from
 * that moment it shows and charges LISTING_PRICE_AFTER ($47), automatically.
 * Every price the visitor sees, and the amount Stripe is told to charge, must
 * come from listingPrice() so nothing can say $17 while charging $47 or the
 * reverse. Recovery messages may only mention the increase because it is real.
 *
 * After the date, fold the new price into TIERS.standard.price and delete this
 * block — with the owner's approval, since it's a price change.
 */
// The increase originally announced for Oct 6 was brought forward to Sep 29 by
// the owner. Date is in the past → listingIncreasePending() is false everywhere.
export const LISTING_PRICE_INCREASE_AT = new Date("2026-09-29T00:00:00Z");
export const LISTING_PRICE_AFTER = 47;
export const LISTING_INCREASE_DATE_LABEL = "Monday, October 6";

export function listingIncreasePending(now: Date = new Date()): boolean {
  return now < LISTING_PRICE_INCREASE_AT;
}

/** The listing price right now: $17 before the increase, $47 after. */
export function listingPrice(now: Date = new Date()): number {
  return listingIncreasePending(now) ? TIERS.standard.price : LISTING_PRICE_AFTER;
}

/**
 * The post-checkout offer chain (owner decision, 2026-09-29):
 *   pay Verified ($47)  → offer page A: Premium for the difference ($50)
 *   pay Premium ($97)   → offer page B: the fleet for FLEET.addOnPrice ($149)
 *   take offer A        → offer page B next
 * Each offer is open for OFFER_WINDOW_HOURS after the purchase it follows, and
 * the page says so. Decline (or let it lapse) and the full price applies:
 * Premium is $97 from the account, the fleet is $297. That is the whole FOMO
 * — a real price, a real window, stated plainly.
 */
export const OFFER_WINDOW_HOURS = 24;

/** True once an offer that followed a purchase created at `createdUnixSeconds` has lapsed. */
export function offerExpired(createdUnixSeconds: number, now: Date = new Date()): boolean {
  return createdUnixSeconds * 1000 + OFFER_WINDOW_HOURS * 3_600_000 < now.getTime();
}

/** Premium on offer page A: the difference between Premium and the listing ($50). */
export function premiumOfferPrice(now: Date = new Date()): number {
  return Math.max(0, TIERS.premium.price - listingPrice(now));
}

/** Premium from the account (offer declined or lapsed): the full price ($97). */
export function premiumUpgradePrice(): number {
  return TIERS.premium.price;
}

/** What offer page B saves versus joining the fleet from the account later. */
export function fleetOfferSavings(): number {
  return FLEET.price - FLEET.addOnPrice;
}

/**
 * The Curri fleet invite (Tier 3) — a SEPARATE product from the listing tiers.
 * Drivers join the Barham Transport carrier account and get loads dispatched to
 * them, and the owner builds their profile, service menu, and website for them.
 *
 * Two prices, on purpose:
 *  - `addOnPrice` ($149) is offered exactly once: on offer page B, right after a
 *    driver pays for Premium (outright, or via offer page A). Open for
 *    OFFER_WINDOW_HOURS; decline it and it's gone. Never shown anywhere else.
 *  - `price` ($297) is what everyone else pays — a homepage/pricing-page visitor
 *    (whose $297 also creates their full FlowSync account and listing) or a
 *    signed-in driver joining from the fleet guide.
 *
 * Refund: fully refundable until the driver is activated on the carrier account;
 * after activation the fee is earned and non-refundable. Two violations on the
 * carrier account means removal from the fleet with no refund. Stated on every
 * fleet surface and acknowledged on the Stripe checkout page.
 *
 * Fees are on loads only: 15% dispatching, paid every Friday; 20% for a payout
 * in 1–2 business days. No monthly fee, no insurance charge.
 */
export const FLEET = {
  id: "curri-fleet",
  name: "Curri fleet invite",
  price: 297,
  addOnPrice: 149,
  dispatchFeePercent: 15,
  fastPayoutFeePercent: 20,
  refundShort: "Fully refundable until you're activated on our carrier account. After activation the fee is earned and non-refundable.",
  refundWhy:
    "Activation is real work on our side and on Curri's — we add you to the carrier account, set up your vehicle and paperwork, and vouch for you. Once that's done it can't be undone, so the fee isn't refundable after activation. Two violations on the carrier account means removal from the fleet, without a refund, because violations put every driver on the account at risk.",
  includes: [
    "Added to our Curri carrier account — loads dispatched to you, no waiting on your own approval",
    "We bid the loads, you run the ones you want; paid every Friday",
    "Everything in Premium: the tools, the ads guide, the Curri mastermind course",
  ],
};

/** Accepts the DB enum ("PREMIUM") or the lowercase id ("premium"). */
export function isPremiumTier(tier?: string | null): boolean {
  return (tier ?? "").toUpperCase() === "PREMIUM";
}

// No paid add-ons at checkout right now. The DOT & EIN guide is now bundled into
// the $17 Standard listing (see TIERS.standard features); the Profit & Loss Tracker
// is the recurring P&L Tracker Pro upsell (PNL_PRO below), currently on standby.
// Kept as an empty list so the checkout/webhook bump plumbing stays intact.
export const BUMPS: Bump[] = [];

export function getBump(id: string): Bump | undefined {
  return BUMPS.find((b) => b.id === id);
}

/**
 * What's inside the Verified listing, as shown on checkout. Only the labels
 * are rendered — the owner removed the "worth $X" anchor figures (2026-09-29)
 * because invented comparison prices next to a $47 product look fake. Keep
 * the numbers out of the UI.
 */
export const VALUE_STACK: { label: string; value: number }[] = [
  { label: "Driver directory listing — get found by local customers", value: 97 },
  { label: "Your own service menu with custom pricing", value: 29 },
  { label: "USDOT + EIN free-filing walkthroughs (skip the $300+ services)", value: 47 },
  { label: "LLC filing guide for your delivery business", value: 19 },
  { label: "Medical courier requirements & licenses guide", value: 29 },
  { label: "Carrier-not-gig signup playbook for Curri & Dispatch", value: 47 },
];

export const VALUE_STACK_TOTAL = VALUE_STACK.reduce((s, i) => s + i.value, 0);

/** Days a driver can request a full refund — surfaced as the money-back guarantee. */
export const GUARANTEE_DAYS = 30;

/**
 * P&L Tracker Pro — the recurring upsell that replaces the old one-time $47 tracker.
 * The free tracker stays free (lead magnet + SEO); Pro adds cloud-save so a driver's
 * books follow them across devices and never get lost. Sold post-purchase with a free
 * first month (card required), so it converts when trust is highest.
 */
export const PNL_PRO = {
  id: "pnl-pro",
  price: 17,
  interval: "month" as const,
  trialDays: 30,
  name: "P&L Tracker Pro",
  tagline: "Your books, saved to your account — first month free.",
  features: [
    "Everything in the free tracker",
    "Saved to your FlowSync account — pick up on any device",
    "Automatic cloud backup so you never lose your numbers",
    "Tax-ready CSV exports, anytime",
  ],
};
