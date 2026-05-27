export const INSPECTION_ITEMS: { id: string; label: string }[] = [
  { id: "tires", label: "Tires & pressure" },
  { id: "brakes", label: "Brakes" },
  { id: "lights", label: "Lights & signals" },
  { id: "fluids", label: "Fluids (oil/coolant)" },
  { id: "mirrors", label: "Mirrors & windshield" },
  { id: "horn", label: "Horn" },
  { id: "seatbelt", label: "Seatbelt" },
  { id: "cargo", label: "Cargo area / securement" },
];

export interface TripView {
  id: string;
  date: string;
  pickupAddress: string;
  dropoffAddress: string;
  earningsCents: number;
  paidMiles: number;
  deadheadMiles: number;
  fuelCents: number;
  tollsCents: number;
  otherExpensesCents: number;
  durationMinutes: number;
  notes: string | null;
  photos: string[];
}

export function tripStats(t: TripView) {
  const totalMiles = t.paidMiles + t.deadheadMiles;
  const expensesCents = t.fuelCents + t.tollsCents + t.otherExpensesCents;
  const profitCents = t.earningsCents - expensesCents;
  const deadheadPct = totalMiles > 0 ? (t.deadheadMiles / totalMiles) * 100 : 0;
  const profitPerMile = totalMiles > 0 ? profitCents / totalMiles : 0;
  return { totalMiles, expensesCents, profitCents, deadheadPct, profitPerMile };
}

export function sumTrips(trips: TripView[]) {
  return trips.reduce(
    (acc, t) => {
      const s = tripStats(t);
      acc.earningsCents += t.earningsCents;
      acc.expensesCents += s.expensesCents;
      acc.profitCents += s.profitCents;
      acc.paidMiles += t.paidMiles;
      acc.deadheadMiles += t.deadheadMiles;
      acc.minutes += t.durationMinutes;
      return acc;
    },
    { earningsCents: 0, expensesCents: 0, profitCents: 0, paidMiles: 0, deadheadMiles: 0, minutes: 0 },
  );
}

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
