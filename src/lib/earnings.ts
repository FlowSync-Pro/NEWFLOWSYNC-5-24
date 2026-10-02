// Data for the free "What are loads going for?" tool (/tools/earnings).
//
// SOURCE (owner-supplied, 2026-10-02): bid-confirmation emails from Curri for
// bids placed from the Barham Transport carrier account, Oct 1–2, 2026 (119 bids).
// These are BIDS, not settled payouts — some won, some lost. Every surface must
// call them "bids we placed", never earnings or what a driver was paid
// (AGENTS.md §E: no income claims). Per load only: the emails carry no distances,
// so there is no per-mile figure. To refresh, replace the numbers and the source
// line together.

export const EARNINGS_SOURCE = {
  account: "Barham Transport carrier account",
  dates: "Oct 1–2, 2026",
  totalBids: 119,
};

export type VehicleId = "car" | "pickup" | "cargo-van" | "sprinter" | "box-truck";

export interface BidRange {
  bids: number;
  /** Middle half of bids (25th–75th percentile) — shown first. */
  typicalLow: number;
  typicalHigh: number;
  median: number;
  min: number;
  max: number;
  /** Optional plain-English example for each end of the full range. */
  minNote?: string;
  maxNote?: string;
}

export interface Vehicle {
  id: VehicleId;
  label: string;
  /** "fleet" → Curri fleet pitch; "listing" → the Verified listing. */
  track: "fleet" | "listing";
  /** null = no data; the tool says so instead of guessing. */
  range: BidRange | null;
}

export const VEHICLES: Vehicle[] = [
  { id: "car", label: "Car, SUV or minivan", track: "listing", range: null },
  {
    id: "pickup",
    label: "Pickup truck",
    track: "fleet",
    range: { bids: 45, typicalLow: 150, typicalHigh: 350, median: 250, min: 90, max: 1400, maxNote: "a long-haul run" },
  },
  { id: "cargo-van", label: "Cargo van", track: "fleet", range: null },
  {
    id: "sprinter",
    label: "Sprinter van",
    track: "fleet",
    range: { bids: 49, typicalLow: 200, typicalHigh: 350, median: 250, min: 95, max: 600, minNote: "a short local hop", maxNote: "a regional run" },
  },
  {
    id: "box-truck",
    label: "Box truck",
    track: "fleet",
    range: { bids: 21, typicalLow: 450, typicalHigh: 620, median: 500, min: 350, max: 1200, maxNote: "a run to Las Vegas" },
  },
];
