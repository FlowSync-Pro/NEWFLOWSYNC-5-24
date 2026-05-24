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
  {
    id: "pnl-tracker",
    price: 47,
    name: "Profit & Loss Tracker",
    tagline: "Know exactly what's coming in and going out.",
    description:
      "A simple tool to track income vs. expenses every week and month, so you always know your real take-home and your business's progress.",
    features: [
      "Weekly & monthly income vs. expenses",
      "See your true take-home pay",
      "Mileage & tax-ready exports",
      "Spot trends and grow profit",
    ],
  },
];

export function getBump(id: string): Bump | undefined {
  return BUMPS.find((b) => b.id === id);
}
