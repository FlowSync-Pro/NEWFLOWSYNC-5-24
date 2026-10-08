"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { setDuty } from "@/lib/dispatch";
import { telegramLinkUrl } from "@/lib/telegram-dispatch";

/** "Connect Telegram": a 15-minute deep link into the bot that ties this chat to the signed-in driver. */
export async function getTelegramLinkUrl(): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in first." };
  const id = await fleetProfileId();
  if (!id) return { ok: false, error: "Fleet members only." };
  const url = telegramLinkUrl(session.userId);
  return url ? { ok: true, url } : { ok: false, error: "Telegram isn't set up on our side yet." };
}

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
