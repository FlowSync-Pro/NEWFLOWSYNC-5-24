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
//   Tier 1 "Verified"  — listingPrice(): $17 until the dated increase, then $47.
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
    price: 17,
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
export const LEGACY_CUTOVER_AT = new Date("2026-10-03T00:00:00Z");

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
export const LISTING_PRICE_INCREASE_AT = new Date("2026-10-06T07:00:00Z"); // 12:00 am Pacific, Mon Oct 6 2026
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
 * The Curri fleet invite (Tier 3) — a SEPARATE product from the listing tiers.
 * Drivers join the Barham Transport carrier account and get loads dispatched to
 * them, and the owner builds their profile, service menu, and website for them.
 *
 * Two prices, on purpose:
 *  - `addOnPrice` ($197) is offered exactly once: on the post-checkout offer page
 *    right after a driver pays the listing. Decline it there and it's gone.
 *  - `price` ($297) is what everyone else pays — a homepage visitor (whose $297
 *    also creates their full FlowSync account and listing) or a signed-in driver
 *    who passed on the offer-page price.
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
  addOnPrice: 197,
  dispatchFeePercent: 15,
  fastPayoutFeePercent: 20,
  refundShort: "Fully refundable until you're activated on our carrier account. After activation the fee is earned and non-refundable.",
  refundWhy:
    "Activation is real work on our side and on Curri's — we add you to the carrier account, set up your vehicle and paperwork, and vouch for you. Once that's done it can't be undone, so the fee isn't refundable after activation. Two violations on the carrier account means removal from the fleet, without a refund, because violations put every driver on the account at risk.",
  includes: [
    "Added to our Curri carrier account — loads dispatched to you, no waiting on your own approval",
    "We bid the loads, you run the ones you want; paid every Friday",
    "Done-for-you setup: we build your FlowSync profile, service menu, and website",
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
 * Value stack shown on checkout. Every item is really included with the $17
 * Standard listing — the "value" figures anchor what each piece would cost on
 * its own, so $17 reads as the steal it is. Keep these honest/defensible.
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
