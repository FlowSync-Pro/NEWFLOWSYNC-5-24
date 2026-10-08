"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { setDuty } from "@/lib/dispatch";

// Driver-side: going on / off duty is the commitment that lets the dispatcher
// claim a load for them (docs/DISPATCH-FLOW.md). Fleet members only.

async function fleetProfileId(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  const p = await prisma.driverProfile.findUnique({ where: { userId: session.userId }, select: { id: true, user: { select: { fleetJoinedAt: true } } } });
  return p?.user.fleetJoinedAt ? p.id : null;
}

export async function goOnDuty(params: { hours: number; radiusMiles: number; maxTripMiles: number }): Promise<{ ok: boolean; error?: string }> {
  const id = await fleetProfileId();
  if (!id) return { ok: false, error: "Fleet members only." };
  const r = await setDuty(id, params);
  revalidatePath("/account/curri-fleet");
  return r;
}

export async function goOffDuty(): Promise<{ ok: boolean; error?: string }> {
  const id = await fleetProfileId();
  if (!id) return { ok: false, error: "Fleet members only." };
  const r = await setDuty(id, null);
  revalidatePath("/account/curri-fleet");
  return r;
}
