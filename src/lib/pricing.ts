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

export const TIERS: Record<TierId, Tier> = {
  standard: {
    id: "standard",
    price: 17,
    // Display name only — the internal id stays "standard" and the DB enum
    // stays STANDARD (id and enum are stable contracts). "Verified" pairs with
    // Premium without sounding like a baseline/lesser tier.
    name: "Verified",
    tagline: "Get listed and take direct bookings.",
    features: [
      "Listed in the FlowSync driver directory",
      "Direct customer bookings — no middleman",
      "Service-matched profile page",
      "Fair-quote calculator",
      "DOT & EIN setup guide included (get them free)",
      "Set your own rates and schedule",
    ],
  },
  premium: {
    id: "premium",
    price: 97,
    name: "Premium",
    tagline: "Run your business your way — build your own service menu.",
    highlight: true,
    features: [
      "Everything in Verified",
      "★ My Services — build your own menu with custom pricing",
      "Premium badge & elevated profile styling",
      "Add your own external website link",
      "Priority placement in the directory",
    ],
  },
};

export function getTier(id: TierId): Tier {
  return TIERS[id];
}

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
  { label: "DOT & EIN setup guide (skip the $300+ filing services)", value: 27 },
  // The guide library was the most under-sold thing in the offer — 14 guides
  // ship today (see lib/guides.ts) and every paying driver already has access
  // (lib/access.ts). Listed as "13 more" so the DOT & EIN guide above isn't
  // double-counted.
  { label: "13 more step-by-step guides — find customers, price for profit, taxes & write-offs", value: 67 },
  { label: "Fair-quote calculator to price every job", value: 39 },
  { label: "Profit & Loss tracker for your business", value: 47 },
  { label: "Your own service menu with custom pricing", value: 29 },
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
