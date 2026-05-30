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
    "Keep 95% of every job (we take just 5%)",
    "A service-matched profile page",
    "Fair-quote calculator to price every job",
    "Set your own rates and schedule",
  ],
};

export const PLATFORM_FEE_PERCENT = 5;

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
    name: "Standard",
    tagline: "Get listed and take direct bookings.",
    features: [
      "Listed in the FlowSync driver directory",
      "Direct customer bookings — keep 95%",
      "Service-matched profile page",
      "Fair-quote calculator",
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
      "Everything in Standard",
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

export const BUMPS: Bump[] = [
  {
    id: "dot-ein-guide",
    price: 27,
    name: "Get Your DOT & EIN — Free",
    tagline: "Step-by-step guide to set your business foundation.",
    description:
      "The exact steps to get your USDOT number and EIN at no cost — and skip the $300+ filing services that charge for free government forms.",
    features: [
      "Get your EIN free (IRS walkthrough)",
      "Get your USDOT number the right way",
      "Checklist + templates included",
      "Avoid the costly mistakes new drivers make",
    ],
    badge: "Most popular",
  },
  // The Profit & Loss Tracker is no longer a one-time bump — it's now the recurring
  // P&L Tracker Pro upsell (see PNL_PRO below), sold after checkout with a free month.
];

export function getBump(id: string): Bump | undefined {
  return BUMPS.find((b) => b.id === id);
}

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
