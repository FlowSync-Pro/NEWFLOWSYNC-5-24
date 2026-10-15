import type { VehicleClass } from "@prisma/client";

// Fleet readiness (/admin/fleet-readiness): for each fleet member, can a load
// offer reach them? The checks mirror rankCandidates() in lib/dispatch.ts —
// activated on Curri, a base ZIP we can place, a vehicle Curri can use, and
// Telegram linked — then Active now and Stripe payouts. Pure functions; the
// page does the reading. Nothing here sends anything.

export type CheckId = "curri" | "zip" | "vehicle" | "telegram" | "payouts" | "active";

export interface ReadinessInput {
  /** False when the fleet member never finished their driver profile. */
  hasProfile: boolean;
  firstName: string;
  curriActivated: boolean;
  /** The base ZIP is set AND we can place it on the map (zipCentroid). */
  zipKnown: boolean;
  zipSet: boolean;
  vehicleType: string | null;
  vehicleClass: VehicleClass | null;
  telegramLinked: boolean;
  payoutsReady: boolean;
  activeUntil: Date | null;
}

export interface Check {
  id: CheckId;
  label: string;
  ok: boolean;
  /** Plain words for what's missing, when not ok. */
  missing?: string;
  /** Who fixes it: the driver (send them the nudge) or the owner. */
  who?: "driver" | "you";
}

export interface Readiness {
  checks: Check[];
  /** Every check offers need (not payouts, not Active now) passes. */
  canGetOffers: boolean;
  activeNow: boolean;
  /** A ready-to-send text covering only the driver's own missing steps; null when there are none. */
  nudge: string | null;
}

const SITE = "flowsyncdriver.com";

export function readiness(r: ReadinessInput, now = new Date()): Readiness {
  const activeNow = !!r.activeUntil && r.activeUntil > now;
  const vehicleMissing = !r.vehicleType?.trim()
    ? "vehicle type not set"
    : !r.vehicleClass
      ? `"${r.vehicleType}" can't run Curri loads`
      : undefined;
  const checks: Check[] = [
    { id: "curri", label: "Activated on Curri", ok: r.curriActivated, missing: "not marked Activated on Curri", who: "you" },
    { id: "zip", label: "Home ZIP", ok: r.zipKnown, missing: r.zipSet ? "home ZIP not recognized" : "no home ZIP", who: "driver" },
    { id: "vehicle", label: "Vehicle", ok: !vehicleMissing, missing: vehicleMissing, who: "driver" },
    { id: "telegram", label: "Telegram", ok: r.telegramLinked, missing: "Telegram not connected", who: "driver" },
    { id: "payouts", label: "Payouts", ok: r.payoutsReady, missing: "Stripe payouts not set up", who: "driver" },
    { id: "active", label: "Active now", ok: activeNow, missing: "not Active right now", who: "driver" },
  ];
  for (const c of checks) if (c.ok) { delete c.missing; delete c.who; }
  const needed: CheckId[] = ["curri", "zip", "vehicle", "telegram"];
  const canGetOffers = checks.filter((c) => needed.includes(c.id)).every((c) => c.ok);

  const steps: string[] = [];
  const failed = (id: CheckId) => !checks.find((c) => c.id === id)!.ok;
  if (!r.hasProfile) {
    steps.push(`finish your driver profile (home ZIP and vehicle) at ${SITE}/account/setup`);
  } else if (failed("zip") || failed("vehicle")) {
    const what = [
      failed("zip") ? "your home ZIP" : null,
      failed("vehicle") ? (r.vehicleType?.trim() ? "your vehicle type to one Curri uses (car, SUV, minivan, pickup, cargo van, Sprinter or box truck)" : "your vehicle type") : null,
    ].filter(Boolean).join(" and ");
    steps.push(`${failed("zip") && !r.zipSet ? "add" : "update"} ${what} on ${SITE}/account/edit`);
  }
  if (failed("telegram")) steps.push(`tap "Connect Telegram" on ${SITE}/account/curri-fleet so load offers reach your phone`);
  if (failed("payouts")) steps.push(`set up payouts at ${SITE}/account/payouts so you can get paid`);
  // "Go Active" only when everything else they control is done — otherwise it can't work yet.
  if (!steps.length && r.curriActivated && !activeNow) steps.push(`when you're ready for loads, send /active to the FlowSync bot (or tap Active on ${SITE}/account/curri-fleet)`);
  const name = r.firstName.trim() || "there";
  const nudge = steps.length
    ? `Hey ${name}, Nas from FlowSync. Quick ${steps.length === 1 ? "step" : "steps"} for the Curri fleet: ${steps.map((s, i) => (steps.length > 1 ? `${i + 1}) ${s}` : s)).join(" ")}. Reply here if you get stuck.`
    : null;
  return { checks, canGetOffers, activeNow, nudge };
}

/** Sort: can't get offers first (most missing first), then ready-but-inactive, then Active. */
export function readinessRank(r: Readiness): number {
  if (!r.canGetOffers) return 100 - r.checks.filter((c) => c.ok).length;
  return r.activeNow ? 0 : 10;
}
