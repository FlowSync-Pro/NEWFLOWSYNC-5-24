"use server";

import { revalidatePath } from "next/cache";
import type { DispatchLane, DispatchStatus, VehicleClass } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { assignLoad, createLoad, offerLoad, respondOffer, setCurriActivated, setLane, transitionLoad } from "@/lib/dispatch";

export async function setDispatchLane(loadId: string, lane: DispatchLane) {
  const actorId = await requireAdmin();
  const r = await setLane(loadId, lane, actorId);
  revalidatePath(`/admin/dispatch/${loadId}`);
  revalidatePath("/admin/dispatch");
  return r;
}
import { parseDollars } from "@/lib/payouts";

// Admin / dispatcher actions for the dispatch board. Every one records who did it.

const refresh = (loadId?: string) => {
  revalidatePath("/admin/dispatch");
  if (loadId) revalidatePath(`/admin/dispatch/${loadId}`);
};

export async function createDispatchLoad(input: {
  curriRef: string;
  lane: DispatchLane;
  rush: boolean;
  pickupAt: string;
  pickupAddress: string;
  pickupZip: string;
  dropoffAddress: string;
  dropoffZip: string;
  vehicleClass: VehicleClass;
  listed: string;
  notes: string;
  /** Curri's stated miles, when known. */
  miles?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const actorId = await requireAdmin();
  const listedCents = input.listed.trim() ? parseDollars(input.listed) : null;
  if (input.listed.trim() && listedCents === null) return { ok: false, error: "Listed price must be a dollar amount, e.g. 145.00." };
  const miles = input.miles?.trim() ? Number(input.miles) : null;
  if (miles !== null && (!Number.isFinite(miles) || miles <= 0)) return { ok: false, error: "Miles must be a number." };
  const r = await createLoad(
    {
      curriRef: input.curriRef,
      lane: input.lane,
      rush: input.rush,
      pickupAt: input.rush ? null : new Date(input.pickupAt),
      pickupAddress: input.pickupAddress,
      pickupZip: input.pickupZip,
      dropoffAddress: input.dropoffAddress,
      dropoffZip: input.dropoffZip,
      vehicleClass: input.vehicleClass,
      listedCents,
      tripMiles: miles,
      notes: input.notes,
    },
    actorId,
  );
  if (r.ok) refresh(r.id);
  return r;
}

export async function assignDispatchLoad(loadId: string, profileId: string) {
  const actorId = await requireAdmin();
  const r = await assignLoad(loadId, profileId, actorId);
  refresh(loadId);
  return r;
}

export async function offerDispatchLoad(loadId: string, profileIds: string[]) {
  const actorId = await requireAdmin();
  const r = await offerLoad(loadId, profileIds, actorId);
  refresh(loadId);
  return r;
}

export async function respondDispatchOffer(loadId: string, offerId: string, response: "ACCEPTED" | "PASSED") {
  const actorId = await requireAdmin();
  const r = await respondOffer(offerId, response, actorId);
  refresh(loadId);
  return r;
}

export async function transitionDispatchLoad(loadId: string, to: DispatchStatus, extras: { bid?: string; note?: string } = {}) {
  const actorId = await requireAdmin();
  const bidCents = extras.bid?.trim() ? parseDollars(extras.bid) : null;
  if (extras.bid?.trim() && bidCents === null) return { ok: false as const, error: "Bid must be a dollar amount." };
  const r = await transitionLoad(loadId, to, actorId, { bidCents, note: extras.note });
  refresh(loadId);
  return r;
}

export async function setDriverCurriActivated(driverProfileId: string, on: boolean): Promise<{ ok: boolean }> {
  await requireAdmin();
  await setCurriActivated(driverProfileId, on);
  revalidatePath(`/admin/drivers/${driverProfileId}`);
  revalidatePath("/admin/dispatch");
  return { ok: true };
}
