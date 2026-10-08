import type { DispatchStatus } from "@prisma/client";
import { prisma } from "./db";
import { FLEET } from "./pricing";
import { SITE_URL } from "./site";
import { sendTelegramMessage, telegramOwnerChatId } from "./telegram";
import { splitLoad, feePercentFor } from "./payouts";

// Telegram messages for the dispatch board (stage 1b). Every function is
// best-effort: no token, no linked chat, or a Telegram error → logged, never
// thrown, so the board keeps working and the dispatcher texts by hand.

const base = () => process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
const $ = (c: number) => `$${(c / 100).toFixed(2)}`;
const when = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });

async function sendSafely(chatId: string | null | undefined, text: string, inlineKeyboard?: { text: string; callback_data: string }[][]): Promise<boolean> {
  if (!chatId) return false;
  try {
    await sendTelegramMessage(chatId, text, inlineKeyboard ? { inlineKeyboard } : {});
    return true;
  } catch (e) {
    console.error("[dispatch] telegram send failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

async function loadSummary(loadId: string) {
  const l = await prisma.dispatchLoad.findUnique({
    where: { id: loadId },
    select: { id: true, rush: true, pickupAt: true, pickupAddress: true, pickupZip: true, dropoffAddress: true, dropoffZip: true, tripMiles: true, vehicleClass: true, listedCents: true, bidCents: true, notes: true, curriRef: true },
  });
  if (!l) return null;
  const lines = [
    `${l.rush ? "RUSH · " : ""}Pickup ${l.pickupAddress}${l.pickupAddress !== l.pickupZip ? ` (${l.pickupZip})` : ""} · ${when(l.pickupAt)}`,
    `Drop ${l.dropoffAddress}${l.dropoffAddress !== l.dropoffZip ? ` (${l.dropoffZip})` : ""} · ~${l.tripMiles ?? "?"} mi`,
    `Vehicle: ${l.vehicleClass.replace("_", " ").toLowerCase()}${l.notes ? ` · ${l.notes}` : ""}`,
  ];
  return { load: l, text: lines.join("\n") };
}

/** What the driver takes home for this load (net after their plan's fee), when a price is known. */
async function payLine(loadId: string, userId: string): Promise<string> {
  const [l, u] = await Promise.all([
    prisma.dispatchLoad.findUnique({ where: { id: loadId }, select: { bidCents: true, listedCents: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { payPlan: true } }),
  ]);
  const gross = l?.bidCents ?? l?.listedCents;
  if (!gross || !u) return "";
  const pct = feePercentFor(u.payPlan);
  return `\nYour pay: ${$(splitLoad(gross, pct).netCents)} (load ${$(gross)} − ${pct}% dispatching fee)`;
}

/** Claim lane: the dispatcher assigned this driver — tell them. */
export async function notifyDriverAssigned(loadId: string): Promise<boolean> {
  const l = await prisma.dispatchLoad.findUnique({ where: { id: loadId }, select: { assignedProfile: { select: { userId: true, user: { select: { telegramChatId: true } } } } } });
  const s = await loadSummary(loadId);
  if (!l?.assignedProfile || !s) return false;
  const text = `✅ ASSIGNED — you're on this load.\n${s.text}${await payLine(loadId, l.assignedProfile.userId)}\n\nWe're claiming it in Curri now. Reply here if anything's wrong. Details: ${base()}/account/curri-fleet`;
  return sendSafely(l.assignedProfile.user.telegramChatId, text);
}

/** Bid lane: offer with Accept / Pass buttons to each driver who is linked. Returns how many got it. */
export async function notifyOffers(loadId: string, profileIds: string[]): Promise<number> {
  const s = await loadSummary(loadId);
  if (!s) return 0;
  const offers = await prisma.dispatchOffer.findMany({
    where: { loadId, driverProfileId: { in: profileIds }, response: "PENDING" },
    select: { id: true, expiresAt: true, driverProfile: { select: { userId: true, user: { select: { telegramChatId: true } } } } },
  });
  let sent = 0;
  for (const o of offers) {
    const mins = Math.max(1, Math.round((o.expiresAt.getTime() - Date.now()) / 60_000));
    const text = `📦 LOAD OFFER — first to accept gets it (${mins} min).\n${s.text}${await payLine(loadId, o.driverProfile.userId)}`;
    const ok = await sendSafely(o.driverProfile.user.telegramChatId, text, [[{ text: "✅ Accept", callback_data: `offer:${o.id}:accept` }, { text: "Pass", callback_data: `offer:${o.id}:pass` }]]);
    if (ok) sent++;
  }
  return sent;
}

/** One line to the assigned driver when the load's fate changes. */
export async function notifyDriverLoadStatus(loadId: string, profileId: string, to: DispatchStatus, note?: string): Promise<boolean> {
  const p = await prisma.driverProfile.findUnique({ where: { id: profileId }, select: { user: { select: { telegramChatId: true } } } });
  const s = await loadSummary(loadId);
  if (!p || !s) return false;
  const head =
    to === "AWARDED" ? "🏁 CONFIRMED — Curri awarded us this load. It's yours."
    : to === "LOST" ? "❌ Not this one — Curri gave the load to another carrier. You're free."
    : to === "CANCELLED" ? `❌ Cancelled${note ? ` — ${note}` : ""}. You're free.`
    : "↩️ Unassigned — this load is no longer yours. You're free.";
  return sendSafely(p.user.telegramChatId, `${head}\n${s.text}`);
}

/** The owner's/dispatcher's phone. */
export async function notifyOwner(text: string): Promise<boolean> {
  return sendSafely(telegramOwnerChatId(), text);
}

/**
 * What the owner's phone says when a load arrives: who the offer went to
 * (wait for an Accept before claiming), who matches but isn't on Telegram
 * (text them), or NOT COVERED.
 */
export function verdictLine(opts: {
  loadId: string; rush: boolean; pickupLabel: string; dropoffLabel: string; vehicle: string; tripMiles: number | null; listedCents: number | null;
  offeredTo: { name: string; miles: number | null }[];
  notOnTelegram: { name: string; phone: string | null; miles: number | null }[];
  offerMinutes: number;
}): string {
  const head = `${opts.rush ? "🚨 RUSH" : "🆕 New load"} ${opts.pickupLabel} → ${opts.dropoffLabel} · ${opts.vehicle} · ~${opts.tripMiles ?? "?"} mi${opts.listedCents !== null ? ` · ${$(opts.listedCents)}` : ""}`;
  const lines: string[] = [];
  if (opts.offeredTo.length) {
    const near = opts.offeredTo[0];
    lines.push(`📨 Offered to ${opts.offeredTo.length} Active driver${opts.offeredTo.length === 1 ? "" : "s"} (nearest ${near.name}, ${near.miles ?? "?"} mi) — open ${opts.offerMinutes} min. Don't claim until someone accepts.`);
  }
  if (opts.notOnTelegram.length) {
    lines.push(`📱 Not on Telegram — text them: ${opts.notOnTelegram.slice(0, 3).map((d) => `${d.name}${d.phone ? ` ${d.phone}` : ""} (${d.miles ?? "?"} mi)`).join(", ")}${opts.notOnTelegram.length > 3 ? ` +${opts.notOnTelegram.length - 3}` : ""}`);
  }
  if (!lines.length) lines.push("⛔ NOT COVERED — no Active driver in range. Don't claim.");
  return `${head}\n${lines.join("\n")}\n${base()}/admin/dispatch/${opts.loadId}`;
}

export const dispatchFeeNote = `Standard ${FLEET.dispatchFeePercent}% · faster ${FLEET.fastPayoutFeePercent}%`;
