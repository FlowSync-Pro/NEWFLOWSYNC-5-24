// "Download my trips" (/account/trips → /api/trips/export): a driver's own trip
// log as a CSV spreadsheet for taxes and their own records. Pure functions, no
// database — the route does the reading. Photos are never included (private).

export interface CsvTrip {
  date: Date;
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
}

export const CSV_HEADER = [
  "Date", "Pickup", "Dropoff", "Earnings ($)", "Paid miles", "Deadhead miles", "Total miles",
  "Fuel ($)", "Tolls ($)", "Other expenses ($)", "Total expenses ($)", "Net profit ($)", "Minutes", "Notes",
];

/** A trip's date as the driver picked it. Saved as midnight UTC, so read in UTC ("2026-03-15"). */
export const tripDay = (d: Date) => d.toISOString().slice(0, 10);

const dollars = (cents: number) => (cents / 100).toFixed(2);
const miles = (m: number) => (Math.round(m * 10) / 10).toString();

/**
 * Text a driver typed (addresses, notes). Quoted when needed, and a leading
 * = + - @ is defused so a spreadsheet never runs it as a formula.
 */
export function csvText(value: string | null | undefined): string {
  let s = (value ?? "").replace(/\r\n?/g, "\n");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Trips (oldest first) + a TOTAL row. CRLF line ends and a BOM so Excel opens it cleanly. */
export function tripsToCsv(trips: CsvTrip[]): string {
  const rows: string[][] = [CSV_HEADER.map(csvText)];
  const t = { earnings: 0, paid: 0, dead: 0, fuel: 0, tolls: 0, other: 0, minutes: 0 };
  for (const x of [...trips].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const expenses = x.fuelCents + x.tollsCents + x.otherExpensesCents;
    rows.push([
      tripDay(x.date), csvText(x.pickupAddress), csvText(x.dropoffAddress), dollars(x.earningsCents),
      miles(x.paidMiles), miles(x.deadheadMiles), miles(x.paidMiles + x.deadheadMiles),
      dollars(x.fuelCents), dollars(x.tollsCents), dollars(x.otherExpensesCents), dollars(expenses),
      dollars(x.earningsCents - expenses), String(x.durationMinutes), csvText(x.notes),
    ]);
    t.earnings += x.earningsCents; t.paid += x.paidMiles; t.dead += x.deadheadMiles;
    t.fuel += x.fuelCents; t.tolls += x.tollsCents; t.other += x.otherExpensesCents; t.minutes += x.durationMinutes;
  }
  const exp = t.fuel + t.tolls + t.other;
  rows.push([
    "TOTAL", `${trips.length} trip${trips.length === 1 ? "" : "s"}`, "", dollars(t.earnings),
    miles(t.paid), miles(t.dead), miles(t.paid + t.dead),
    dollars(t.fuel), dollars(t.tolls), dollars(t.other), dollars(exp), dollars(t.earnings - exp), String(t.minutes), "",
  ]);
  return "﻿" + rows.map((r) => r.join(",")).join("\r\n") + "\r\n";
}

/**
 * Which trips to export: `year=2026` (a tax year), or nothing for all trips.
 * Returns UTC bounds on the saved trip date (dates are stored as midnight UTC),
 * or an error for anything malformed.
 */
export function exportRange(year: string | null, now = new Date()): { from: Date | null; to: Date | null; label: string } | { error: string } {
  if (!year || year === "all") return { from: null, to: null, label: "all" };
  if (!/^\d{4}$/.test(year)) return { error: "Pick a year like 2026." };
  const y = Number(year);
  if (y < 2000 || y > now.getUTCFullYear() + 1) return { error: "That year is out of range." };
  return { from: new Date(Date.UTC(y, 0, 1)), to: new Date(Date.UTC(y + 1, 0, 1)), label: String(y) };
}
