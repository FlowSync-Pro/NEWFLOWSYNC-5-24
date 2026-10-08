import type { DispatchLane, DispatchStatus, VehicleClass } from "@prisma/client";
import { prisma } from "./db";
import { locate, haversineMiles, zipCentroid } from "./geo";
import { FLEET } from "./pricing";
import { notifyDriverAssigned, notifyDriverLoadStatus, notifyOffers } from "./dispatch-notify";

// Dispatch board, stage 1a — docs/DISPATCH-FLOW.md.
//
// A Curri opportunity becomes a DispatchLoad. The board ranks fleet drivers by
// distance from their base ZIP to the pickup and says whether the load is
// COVERED: an on-duty driver whose commitment (radius, max trip miles, vehicle,
// not busy) fits. Claim-lane loads may only be assigned when covered — the
// dispatcher claims in Curri knowing who runs it, because releasing a claim
// is a serious violation. Bid-lane loads are offered and accepted first.
// Every change writes a DispatchEvent; loads are never deleted.

// ---- Vehicles -------------------------------------------------------------

export const VEHICLE_CLASSES: { id: VehicleClass; label: string }[] = [
  { id: "CAR", label: "Car" },
  { id: "SUV", label: "SUV" },
  { id: "MINIVAN", label: "Minivan" },
  { id: "PICKUP_TRUCK", label: "Pickup truck" },
  { id: "CARGO_VAN", label: "Cargo van" },
  { id: "SPRINTER_VAN", label: "Sprinter van" },
  { id: "BOX_TRUCK", label: "Box truck" },
];

const RANK: Record<VehicleClass, number> = { CAR: 0, SUV: 1, MINIVAN: 2, PICKUP_TRUCK: 3, CARGO_VAN: 4, SPRINTER_VAN: 5, BOX_TRUCK: 6 };

export const vehicleClassLabel = (c: VehicleClass | null | undefined) => VEHICLE_CLASSES.find((v) => v.id === c)?.label ?? "—";

/** The profile's free-text vehicle type (AccountEditor's list) → Curri class. */
export function vehicleClassFromType(type: string | null | undefined): VehicleClass | null {
  const t = (type ?? "").trim().toLowerCase();
  if (!t) return null;
  if (t.startsWith("sedan") || t === "car") return "CAR";
  if (t === "suv") return "SUV";
  if (t.startsWith("minivan")) return "MINIVAN";
  if (t.startsWith("pickup")) return "PICKUP_TRUCK";
  if (t.startsWith("cargo")) return "CARGO_VAN";
  if (t.startsWith("sprinter")) return "SPRINTER_VAN";
  if (t.startsWith("box")) return "BOX_TRUCK";
  return null; // bike / scooter / unknown
}

/** A bigger vehicle may cover a smaller load's class (owner decision 2026-10-08). */
export const canCover = (driver: VehicleClass, required: VehicleClass) => RANK[driver] >= RANK[required];

/** Curri's email wording ("box truck-sized vehicle", "Sprinter Van with a Liftgate") → class. */
export function vehicleClassFromCurriText(text: string | null | undefined): VehicleClass | null {
  const t = (text ?? "").toLowerCase();
  if (!t) return null;
  if (t.includes("box truck")) return "BOX_TRUCK";
  if (t.includes("sprinter")) return "SPRINTER_VAN";
  if (t.includes("cargo van")) return "CARGO_VAN";
  if (t.includes("pickup")) return "PICKUP_TRUCK";
  if (t.includes("minivan")) return "MINIVAN";
  if (t.includes("suv")) return "SUV";
  if (t.includes("car")) return "CAR";
  return null;
}

// ---- Constants ------------------------------------------------------------

export const DUTY_DEFAULTS = { shiftHours: 8, radiusMiles: 30, maxTripMiles: 150 };
/** Straight-line ZIP-to-ZIP miles × this ≈ road miles. */
export const ROAD_FACTOR = 1.25;
export const AVG_MPH = 35;
export const HANDLING_MINUTES = 30;
export const RUSH_WINDOW_MINUTES = 30;
/** How long an offer stays open (owner decision 2026-10-08): 3 min scheduled, 2 min rush. */
export const OFFER_MINUTES = 3;
export const OFFER_MINUTES_RUSH = 2;
/** Automatic offers go to at most this many matching drivers, nearest first. */
export const MAX_AUTO_OFFERS = 10;
export const DEFAULT_COST_PER_MILE = 0.65;
export const DEFAULT_HOURLY_TARGET = 35;

export const estimateTripMinutes = (roadMiles: number) => Math.round((roadMiles / AVG_MPH) * 60 + HANDLING_MINUTES);
export const minutesToPickup = (roadMiles: number) => Math.round((roadMiles / AVG_MPH) * 60);

export const STATUS_LABEL: Record<DispatchStatus, string> = {
  NEW: "New",
  OFFERED: "Offered",
  ASSIGNED: "Assigned",
  PLACED: "Bid placed",
  AWARDED: "Awarded",
  LOST: "Lost",
  IN_PROGRESS: "In progress",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
export const LANE_LABEL: Record<DispatchLane, string> = { CLAIM: "Claim (listed price)", BID: "Bid" };
export const OPEN_STATUSES: DispatchStatus[] = ["NEW", "OFFERED", "ASSIGNED", "PLACED", "AWARDED", "IN_PROGRESS"];
const BUSY_STATUSES: DispatchStatus[] = ["ASSIGNED", "PLACED", "AWARDED", "IN_PROGRESS"];

const TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  NEW: ["OFFERED", "ASSIGNED", "CANCELLED"],
  OFFERED: ["ASSIGNED", "NEW", "CANCELLED"],
  ASSIGNED: ["PLACED", "AWARDED", "NEW", "CANCELLED"],
  PLACED: ["AWARDED", "LOST", "CANCELLED"],
  AWARDED: ["IN_PROGRESS", "DELIVERED", "CANCELLED"],
  IN_PROGRESS: ["DELIVERED", "CANCELLED"],
  LOST: [],
  DELIVERED: [],
  CANCELLED: [],
};
export const canTransition = (from: DispatchStatus, to: DispatchStatus) => TRANSITIONS[from].includes(to);

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function logEvent(loadId: string, actorId: string | null, from: DispatchStatus | null, to: DispatchStatus | null, note?: string) {
  await prisma.dispatchEvent.create({ data: { loadId, actorId, fromStatus: from, toStatus: to, note: note ?? null } });
}

// ---- Loads ----------------------------------------------------------------

export interface NewLoadInput {
  curriRef?: string;
  lane: DispatchLane;
  rush: boolean;
  /** Required unless rush (rush = now + RUSH_WINDOW_MINUTES). */
  pickupAt?: Date | null;
  /** Street address when known; Curri's emails only give the city, so this may equal the location. */
  pickupAddress: string;
  /** Location key: a ZIP, "City, ST", or just "City" (Curri's emails). Stored resolved. */
  pickupZip: string;
  dropoffAddress: string;
  dropoffZip: string;
  vehicleClass: VehicleClass;
  listedCents?: number | null;
  /** Curri's own trip miles when the email states them; otherwise estimated. */
  tripMiles?: number | null;
  notes?: string;
}

/** Base points of every fleet driver with a ZIP — used to pick the right "Ontario" for a bare city name. */
export async function fleetBasePoints(): Promise<{ lat: number; lng: number }[]> {
  const rows = await prisma.driverProfile.findMany({ where: { baseZip: { not: null }, user: { fleetJoinedAt: { not: null } } }, select: { baseZip: true } });
  return rows.map((r) => zipCentroid(r.baseZip)).filter((c): c is { lat: number; lng: number } => !!c);
}

/** Road miles between two location keys (centroids × road factor), with a floor for same-place trips. */
export function estimateRoadMiles(keyA: string, keyB: string, near: { lat: number; lng: number }[] = []): number | null {
  const a = locate(keyA, near);
  const b = locate(keyB, near);
  if (!a || !b) return null;
  return Math.max(3, Math.round(haversineMiles(a, b) * ROAD_FACTOR * 10) / 10);
}

export async function createLoad(input: NewLoadInput, actorId: string): Promise<Result<{ id: string }>> {
  const near = await fleetBasePoints();
  const pickup = locate(input.pickupZip, near);
  const dropoff = locate(input.dropoffZip, near);
  if (!pickup) return { ok: false, error: `Pickup "${input.pickupZip}" isn't a ZIP or city we know. Try "City, ST".` };
  if (!dropoff) return { ok: false, error: `Dropoff "${input.dropoffZip}" isn't a ZIP or city we know. Try "City, ST".` };
  const pickupAddress = input.pickupAddress.trim() || pickup.label;
  const dropoffAddress = input.dropoffAddress.trim() || dropoff.label;
  const pickupAt = input.rush ? new Date(Date.now() + RUSH_WINDOW_MINUTES * 60_000) : input.pickupAt;
  if (!pickupAt || Number.isNaN(pickupAt.getTime())) return { ok: false, error: "Pick the pickup time (or mark it rush)." };
  const curriMiles = typeof input.tripMiles === "number" && input.tripMiles > 0 ? Math.round(input.tripMiles * 10) / 10 : null;
  const tripMiles = curriMiles ?? Math.max(3, Math.round(haversineMiles(pickup, dropoff) * ROAD_FACTOR * 10) / 10);
  const busyUntil = new Date(pickupAt.getTime() + estimateTripMinutes(tripMiles) * 60_000);
  const load = await prisma.dispatchLoad.create({
    data: {
      curriRef: input.curriRef?.trim().slice(0, 120) || null,
      lane: input.lane,
      rush: input.rush,
      pickupAt,
      pickupAddress: pickupAddress.slice(0, 200),
      pickupZip: pickup.label,
      dropoffAddress: dropoffAddress.slice(0, 200),
      dropoffZip: dropoff.label,
      tripMiles,
      vehicleClass: input.vehicleClass,
      listedCents: input.listedCents ?? null,
      notes: input.notes?.trim().slice(0, 500) || null,
      busyUntil,
      createdById: actorId,
    },
    select: { id: true },
  });
  await logEvent(load.id, actorId, null, "NEW", [input.rush ? "Rush load" : null, curriMiles ? `${curriMiles} mi per Curri` : null].filter(Boolean).join(" · ") || undefined);
  return { ok: true, id: load.id };
}

/** Claim ↔ bid while the load is still open for assignment. */
export async function setLane(loadId: string, lane: DispatchLane, actorId: string): Promise<Result> {
  const r = await prisma.dispatchLoad.updateMany({ where: { id: loadId, status: { in: ["NEW", "OFFERED"] } }, data: { lane } });
  if (r.count === 0) return { ok: false, error: "Lane can only change while the load is new or offered." };
  await logEvent(loadId, actorId, null, null, `Lane → ${LANE_LABEL[lane]}`);
  return { ok: true };
}

// ---- Candidates -----------------------------------------------------------

export interface Candidate {
  profileId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  vehicleType: string;
  vehicleClass: VehicleClass | null;
  baseZip: string | null;
  milesToPickup: number | null;
  minutesToPickup: number | null;
  activated: boolean;
  onDuty: boolean;
  onDutyUntil: Date | null;
  radiusMiles: number;
  maxTripMiles: number;
  withinRadius: boolean;
  tripOk: boolean;
  vehicleOk: boolean;
  busy: boolean;
  canMakeRush: boolean;
  /** Linked on Telegram, so an automatic offer can reach them. */
  onTelegram: boolean;
  /** All hard filters pass — Active, activated, vehicle, radius, trip, not busy, rush reach. */
  covered: boolean;
  /** Why not covered, in plain words. Empty when covered. */
  reasons: string[];
}

export interface LoadForRanking {
  id: string;
  pickupZip: string;
  pickupAt: Date;
  busyUntil: Date | null;
  rush: boolean;
  tripMiles: number | null;
  vehicleClass: VehicleClass;
}

export async function rankCandidates(load: LoadForRanking, now = new Date()): Promise<Candidate[]> {
  const pickup = locate(load.pickupZip);
  const profiles = await prisma.driverProfile.findMany({
    where: { user: { fleetJoinedAt: { not: null } } },
    select: {
      id: true, userId: true, firstName: true, lastName: true, phone: true, vehicleType: true, baseZip: true,
      curriActivatedAt: true, onDutyUntil: true, dutyRadiusMiles: true, dutyMaxTripMiles: true,
      user: { select: { email: true, telegramChatId: true } },
    },
  });
  const ids = profiles.map((p) => p.id);
  const busyRows = ids.length && load.busyUntil
    ? await prisma.dispatchLoad.findMany({
        where: {
          id: { not: load.id },
          assignedProfileId: { in: ids },
          status: { in: BUSY_STATUSES },
          pickupAt: { lt: load.busyUntil },
          busyUntil: { gt: load.pickupAt },
        },
        select: { assignedProfileId: true },
      })
    : [];
  const busySet = new Set(busyRows.map((r) => r.assignedProfileId));

  const out: Candidate[] = profiles.map((p) => {
    const base = zipCentroid(p.baseZip);
    const straight = base && pickup ? haversineMiles(base, pickup) : null;
    const miles = straight === null ? null : Math.round(straight * ROAD_FACTOR * 10) / 10;
    const vehicleClass = vehicleClassFromType(p.vehicleType);
    const radiusMiles = p.dutyRadiusMiles ?? DUTY_DEFAULTS.radiusMiles;
    const maxTripMiles = p.dutyMaxTripMiles ?? DUTY_DEFAULTS.maxTripMiles;
    const onDuty = !!p.onDutyUntil && p.onDutyUntil > now;
    const activated = !!p.curriActivatedAt;
    const withinRadius = miles !== null && miles <= radiusMiles;
    const tripOk = (load.tripMiles ?? 0) <= maxTripMiles;
    const vehicleOk = !!vehicleClass && canCover(vehicleClass, load.vehicleClass);
    const busy = busySet.has(p.id);
    const canMakeRush = !load.rush || (miles !== null && minutesToPickup(miles) <= RUSH_WINDOW_MINUTES);
    const reasons: string[] = [];
    if (!activated) reasons.push("not activated on Curri");
    if (!p.baseZip || !base) reasons.push("no base ZIP");
    if (!vehicleClass) reasons.push("vehicle type not set");
    else if (!vehicleOk) reasons.push(`${vehicleClassLabel(vehicleClass)} can't cover ${vehicleClassLabel(load.vehicleClass)}`);
    if (!onDuty) reasons.push("inactive");
    if (miles !== null && !withinRadius) reasons.push(`${miles} mi > ${radiusMiles} mi radius`);
    if (!tripOk) reasons.push(`trip ${load.tripMiles} mi > ${maxTripMiles} mi max`);
    if (busy) reasons.push("busy on another load");
    if (!canMakeRush && miles !== null) reasons.push(`~${minutesToPickup(miles)} min away, rush needs ≤ ${RUSH_WINDOW_MINUTES}`);
    return {
      profileId: p.id,
      userId: p.userId,
      name: `${p.firstName} ${p.lastName}`.trim() || p.user.email,
      email: p.user.email,
      phone: p.phone,
      vehicleType: p.vehicleType ?? "",
      vehicleClass,
      baseZip: p.baseZip,
      milesToPickup: miles,
      minutesToPickup: miles === null ? null : minutesToPickup(miles),
      activated,
      onDuty,
      onDutyUntil: p.onDutyUntil,
      radiusMiles,
      maxTripMiles,
      withinRadius,
      tripOk,
      vehicleOk,
      busy,
      canMakeRush,
      onTelegram: !!p.user.telegramChatId,
      covered: reasons.length === 0,
      reasons,
    };
  });
  return out.sort((a, b) => Number(b.covered) - Number(a.covered) || (a.milesToPickup ?? 1e9) - (b.milesToPickup ?? 1e9));
}

// ---- Bid suggestion (the bidding calculator's formula) ---------------------

export interface BidSuggestion {
  tripMiles: number;
  deadheadMiles: number;
  costPerMile: number;
  costPerMileSource: "driver P&L" | "default";
  hours: number;
  vehicleCost: number;
  timeValue: number;
  feePct: number;
  /** Bid that only covers the vehicle (net = 0 after fee). Below this the driver loses money. */
  floor: number;
  /** Bid that covers the vehicle and pays the driver's hours. */
  worthIt: number;
  /** max(worthIt, listed) rounded up to $5. */
  suggested: number;
}

/** Cost per mile from the driver's own P&L (last 200 trips, ≥ 100 miles), else the calculator default. */
export async function driverCostPerMile(profileId: string): Promise<{ value: number; source: BidSuggestion["costPerMileSource"] }> {
  const trips = await prisma.trip.findMany({
    where: { driverProfileId: profileId },
    orderBy: { date: "desc" },
    take: 200,
    select: { paidMiles: true, deadheadMiles: true, fuelCents: true, tollsCents: true, otherExpensesCents: true },
  });
  const miles = trips.reduce((s, t) => s + (t.paidMiles ?? 0) + (t.deadheadMiles ?? 0), 0);
  const cents = trips.reduce((s, t) => s + (t.fuelCents ?? 0) + (t.tollsCents ?? 0) + (t.otherExpensesCents ?? 0), 0);
  if (miles >= 100 && cents > 0) return { value: Math.round((cents / miles) / 100 * 100) / 100, source: "driver P&L" };
  return { value: DEFAULT_COST_PER_MILE, source: "default" };
}

export function suggestBid(opts: { tripMiles: number; milesToPickup: number; costPerMile: number; costPerMileSource: BidSuggestion["costPerMileSource"]; listedCents: number | null; hourlyTarget?: number }): BidSuggestion {
  const deadheadMiles = Math.round(opts.milesToPickup * 2 * 10) / 10; // to pickup + back, like the calculator's hint
  const miles = opts.tripMiles + deadheadMiles;
  const hours = Math.round(((estimateTripMinutes(opts.tripMiles) + minutesToPickup(opts.milesToPickup)) / 60) * 10) / 10;
  const vehicleCost = miles * opts.costPerMile;
  const timeValue = hours * (opts.hourlyTarget ?? DEFAULT_HOURLY_TARGET);
  const feePct = FLEET.dispatchFeePercent / 100;
  const floor = vehicleCost / (1 - feePct);
  const worthIt = (vehicleCost + timeValue) / (1 - feePct);
  const listed = (opts.listedCents ?? 0) / 100;
  const suggested = Math.ceil(Math.max(worthIt, listed) / 5) * 5;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { tripMiles: opts.tripMiles, deadheadMiles, costPerMile: opts.costPerMile, costPerMileSource: opts.costPerMileSource, hours, vehicleCost: r2(vehicleCost), timeValue: r2(timeValue), feePct, floor: r2(floor), worthIt: r2(worthIt), suggested };
}

// ---- Assignment, offers, transitions ---------------------------------------

/**
 * A driver is committed to this load: either they tapped Accept on an offer
 * (viaOffer), or the dispatcher confirmed with them by phone (manual Assign).
 * Either way the hard safety checks hold: activated on Curri, the right
 * vehicle, not already busy. Active/radius aren't required for a phone-confirmed
 * assign — the driver said yes to this specific load.
 */
export async function assignLoad(loadId: string, profileId: string, actorId: string, opts: { viaOffer?: boolean } = {}): Promise<Result> {
  const load = await prisma.dispatchLoad.findUnique({ where: { id: loadId } });
  if (!load) return { ok: false, error: "Load not found." };
  if (!["NEW", "OFFERED"].includes(load.status)) return { ok: false, error: `Can't assign a load that is ${STATUS_LABEL[load.status].toLowerCase()}.` };
  const candidates = await rankCandidates(load);
  const c = candidates.find((x) => x.profileId === profileId);
  if (!c) return { ok: false, error: "That driver isn't a fleet member." };
  if (!c.activated) return { ok: false, error: `${c.name} isn't activated on Curri yet.` };
  if (!c.vehicleOk) return { ok: false, error: `${c.name}: ${c.vehicleClass ? `${vehicleClassLabel(c.vehicleClass)} can't cover ${vehicleClassLabel(load.vehicleClass)}` : "vehicle type not set"}.` };
  if (c.busy) return { ok: false, error: `${c.name} is busy on another load at that time.` };
  const r = await prisma.dispatchLoad.updateMany({
    where: { id: loadId, status: { in: ["NEW", "OFFERED"] } },
    data: { status: "ASSIGNED", assignedProfileId: profileId },
  });
  if (r.count === 0) return { ok: false, error: "Someone else just changed this load — reload." };
  await prisma.dispatchOffer.updateMany({ where: { loadId, response: "PENDING", driverProfileId: { not: profileId } }, data: { response: "EXPIRED", respondedAt: new Date() } });
  await logEvent(loadId, actorId, load.status, "ASSIGNED", `${c.name} (${c.milesToPickup ?? "?"} mi to pickup)${opts.viaOffer ? " — accepted the offer" : " — confirmed by phone"}`);
  if (!opts.viaOffer) await notifyDriverAssigned(loadId); // offer accepts are confirmed on the tap itself
  return { ok: true };
}

/** Offer to several drivers at once (either lane); first accept wins. Drivers without Telegram are texted by the dispatcher. */
export async function offerLoad(loadId: string, profileIds: string[], actorId: string): Promise<Result<{ offered: number; sent: number }>> {
  const load = await prisma.dispatchLoad.findUnique({ where: { id: loadId } });
  if (!load) return { ok: false, error: "Load not found." };
  if (!["NEW", "OFFERED"].includes(load.status)) return { ok: false, error: `Can't offer a load that is ${STATUS_LABEL[load.status].toLowerCase()}.` };
  const already = new Set((await prisma.dispatchOffer.findMany({ where: { loadId, response: "PENDING", expiresAt: { gt: new Date() } }, select: { driverProfileId: true } })).map((o) => o.driverProfileId));
  const ids = [...new Set(profileIds)].filter((x) => x && !already.has(x));
  if (ids.length === 0) return { ok: false, error: already.size ? "Those drivers already have an open offer." : "Pick at least one driver." };
  const expiresAt = new Date(Date.now() + (load.rush ? OFFER_MINUTES_RUSH : OFFER_MINUTES) * 60_000);
  await prisma.dispatchOffer.createMany({ data: ids.map((driverProfileId) => ({ loadId, driverProfileId, expiresAt })) });
  if (load.status === "NEW") await prisma.dispatchLoad.update({ where: { id: loadId }, data: { status: "OFFERED" } });
  await logEvent(loadId, actorId, load.status === "NEW" ? "NEW" : null, load.status === "NEW" ? "OFFERED" : null, `Offered to ${ids.length} driver${ids.length === 1 ? "" : "s"}`);
  const sent = await notifyOffers(loadId, ids);
  if (sent < ids.length) await logEvent(loadId, actorId, null, null, `${ids.length - sent} driver${ids.length - sent === 1 ? "" : "s"} not on Telegram — text them`);
  return { ok: true, offered: ids.length, sent };
}

export interface AutoOfferResult {
  /** Drivers the offer reached on Telegram. */
  offeredTo: { name: string; miles: number | null }[];
  /** Matching drivers we couldn't reach (not linked on Telegram) — text them. */
  notOnTelegram: { name: string; phone: string | null; miles: number | null }[];
}

/**
 * A load just arrived: offer it to every matching Active driver on Telegram,
 * nearest first, up to MAX_AUTO_OFFERS (owner decision 2026-10-08). The owner
 * claims in Curri only after someone accepts. Never assigns on its own.
 */
export async function autoOffer(loadId: string, actorId: string): Promise<AutoOfferResult> {
  const out: AutoOfferResult = { offeredTo: [], notOnTelegram: [] };
  const load = await prisma.dispatchLoad.findUnique({ where: { id: loadId } });
  if (!load || !["NEW", "OFFERED"].includes(load.status)) return out;
  const covered = (await rankCandidates(load)).filter((c) => c.covered);
  const reachable = covered.filter((c) => c.onTelegram).slice(0, MAX_AUTO_OFFERS);
  out.notOnTelegram = covered.filter((c) => !c.onTelegram).map((c) => ({ name: c.name, phone: c.phone, miles: c.milesToPickup }));
  if (reachable.length) {
    const r = await offerLoad(loadId, reachable.map((c) => c.profileId), actorId);
    if (r.ok) out.offeredTo = reachable.map((c) => ({ name: c.name, miles: c.milesToPickup }));
  }
  return out;
}

/** Record a driver's answer to an offer (by the dispatcher in 1a; by Telegram in 1b). First accept wins. */
export async function respondOffer(offerId: string, response: "ACCEPTED" | "PASSED", actorId: string): Promise<Result> {
  const offer = await prisma.dispatchOffer.findUnique({ where: { id: offerId }, include: { load: { select: { id: true, status: true } } } });
  if (!offer) return { ok: false, error: "Offer not found." };
  if (offer.response !== "PENDING") {
    // Expired because another driver accepted first reads as "taken", not "expired".
    if (offer.response === "EXPIRED" && offer.load.status !== "OFFERED" && offer.load.status !== "NEW") return { ok: false, error: "Taken — someone was faster." };
    return { ok: false, error: `Already ${offer.response.toLowerCase()}.` };
  }
  if (offer.expiresAt.getTime() < Date.now()) {
    await prisma.dispatchOffer.update({ where: { id: offerId }, data: { response: "EXPIRED", respondedAt: new Date() } });
    return { ok: false, error: "This offer expired." };
  }
  if (response === "PASSED") {
    await prisma.dispatchOffer.update({ where: { id: offerId }, data: { response: "PASSED", respondedAt: new Date() } });
    await logEvent(offer.loadId, actorId, null, null, "A driver passed");
    return { ok: true };
  }
  if (offer.load.status !== "OFFERED") return { ok: false, error: "Taken — this load was already assigned." };
  const r = await assignLoad(offer.loadId, offer.driverProfileId, actorId, { viaOffer: true });
  if (!r.ok) return r;
  await prisma.dispatchOffer.update({ where: { id: offerId }, data: { response: "ACCEPTED", respondedAt: new Date() } });
  return { ok: true };
}

export async function transitionLoad(loadId: string, to: DispatchStatus, actorId: string, extras: { bidCents?: number | null; note?: string } = {}): Promise<Result> {
  const load = await prisma.dispatchLoad.findUnique({ where: { id: loadId } });
  if (!load) return { ok: false, error: "Load not found." };
  if (!canTransition(load.status, to)) return { ok: false, error: `Can't go from ${STATUS_LABEL[load.status]} to ${STATUS_LABEL[to]}.` };
  if (to === "CANCELLED" && !extras.note?.trim()) return { ok: false, error: "Say why it's cancelled." };
  if (to === "PLACED" && load.lane === "BID" && !extras.bidCents) return { ok: false, error: "Enter the bid you placed." };
  const data: { status: DispatchStatus; bidCents?: number; assignedProfileId?: null } = { status: to };
  if (extras.bidCents) data.bidCents = extras.bidCents;
  if (to === "NEW") data.assignedProfileId = null; // unassign / re-open
  const r = await prisma.dispatchLoad.updateMany({ where: { id: loadId, status: load.status }, data });
  if (r.count === 0) return { ok: false, error: "Someone else just changed this load — reload." };
  if (to === "NEW" || to === "CANCELLED" || to === "LOST") {
    await prisma.dispatchOffer.updateMany({ where: { loadId, response: "PENDING" }, data: { response: "EXPIRED", respondedAt: new Date() } });
  }
  await logEvent(loadId, actorId, load.status, to, extras.note?.trim() || (extras.bidCents ? `Bid $${(extras.bidCents / 100).toFixed(2)}` : undefined));
  if (load.assignedProfileId && (to === "AWARDED" || to === "LOST" || to === "CANCELLED" || to === "NEW")) {
    await notifyDriverLoadStatus(loadId, load.assignedProfileId, to, extras.note);
  }
  return { ok: true };
}

/** Once the payout for this load is logged: remember it and mark the load delivered. */
export async function linkPayout(loadId: string, payoutId: string, actorId: string): Promise<void> {
  const load = await prisma.dispatchLoad.findUnique({ where: { id: loadId }, select: { status: true } });
  if (!load) return;
  const deliverable = load.status === "AWARDED" || load.status === "IN_PROGRESS";
  await prisma.dispatchLoad.update({ where: { id: loadId }, data: { payoutId, ...(deliverable ? { status: "DELIVERED" } : {}) } });
  await logEvent(loadId, actorId, deliverable ? load.status : null, deliverable ? "DELIVERED" : null, "Payout logged");
}

// ---- Driver duty + Curri activation ---------------------------------------

export async function setDuty(profileId: string, params: { hours: number; radiusMiles: number; maxTripMiles: number } | null): Promise<Result> {
  if (params) {
    const hours = Math.min(24, Math.max(1, Math.round(params.hours)));
    const radiusMiles = Math.min(300, Math.max(5, Math.round(params.radiusMiles)));
    const maxTripMiles = Math.min(1000, Math.max(5, Math.round(params.maxTripMiles)));
    await prisma.driverProfile.update({
      where: { id: profileId },
      data: { onDutyUntil: new Date(Date.now() + hours * 3_600_000), dutyRadiusMiles: radiusMiles, dutyMaxTripMiles: maxTripMiles },
    });
  } else {
    await prisma.driverProfile.update({ where: { id: profileId }, data: { onDutyUntil: null } });
  }
  return { ok: true };
}

export async function setCurriActivated(profileId: string, on: boolean): Promise<void> {
  const p = await prisma.driverProfile.findUnique({ where: { id: profileId }, select: { curriActivatedAt: true } });
  await prisma.driverProfile.update({ where: { id: profileId }, data: { curriActivatedAt: on ? (p?.curriActivatedAt ?? new Date()) : null } });
}
