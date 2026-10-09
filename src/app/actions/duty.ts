"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { setDuty } from "@/lib/dispatch";
import { announceOfferAnswer, telegramLinkUrl, type OfferAction } from "@/lib/telegram-dispatch";
import { respondOffer } from "@/lib/dispatch";
import { answerCode, type AnswerCode } from "@/lib/offer-answer";

/** "Connect Telegram": a 15-minute deep link into the bot that ties this chat to the signed-in driver. */
export async function getTelegramLinkUrl(): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in first." };
  const id = await fleetProfileId();
  if (!id) return { ok: false, error: "Fleet members only." };
  const url = telegramLinkUrl(session.userId);
  return url ? { ok: true, url } : { ok: false, error: "Telegram isn't set up on our side yet." };
}

// Driver-side: Active / Inactive (stored as onDutyUntil). Active = send me load offers;
// the driver accepts or passes each one (docs/DISPATCH-FLOW.md). Fleet members only.

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

/**
 * Accept or Pass an offer from the fleet page (stage 2c). The same path as a
 * Telegram tap: the offer must belong to the signed-in fleet member (the page
 * is never trusted), respondOffer decides first-tap-wins, and on success the
 * shared step pings the owner first, then confirms to the driver on Telegram.
 */
export async function answerMyOffer(offerId: string, action: OfferAction): Promise<{ ok: boolean; code: AnswerCode | null; message: string }> {
  const fail = (message: string) => ({ ok: false, code: null, message });
  const session = await getSession();
  if (!session) return fail("Sign in first.");
  if (typeof offerId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(offerId) || (action !== "accept" && action !== "pass")) return fail("Something's off — tap Refresh and try again.");
  const p = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, firstName: true, lastName: true, user: { select: { fleetJoinedAt: true, telegramChatId: true } } },
  });
  if (!p?.user.fleetJoinedAt) return fail("Fleet members only.");
  const offer = await prisma.dispatchOffer.findUnique({ where: { id: offerId }, select: { driverProfileId: true, loadId: true, load: { select: { lane: true } } } });
  if (!offer || offer.driverProfileId !== p.id) return fail("That offer isn't yours.");

  const r = await respondOffer(offerId, action === "accept" ? "ACCEPTED" : "PASSED", session.userId);
  if (r.ok) {
    await announceOfferAnswer({
      loadId: offer.loadId, driverProfileId: p.id, driverName: `${p.firstName} ${p.lastName}`.trim(),
      driverChatId: p.user.telegramChatId, action, via: "website",
    });
  }
  revalidatePath("/account/curri-fleet");
  const code = answerCode(action, r, offer.load.lane);
  return { ok: r.ok, code, message: r.ok ? "" : r.error };
}
