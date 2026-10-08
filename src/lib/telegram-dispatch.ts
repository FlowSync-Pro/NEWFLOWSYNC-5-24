import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { answerTelegramCallback, sendTelegramMessage, telegramBotUsername, telegramOwnerChatId } from "./telegram";
import { DUTY_DEFAULTS, driverCostPerMile, rankCandidates, respondOffer, setDuty, suggestBid, type LoadForRanking } from "./dispatch";
import { SITE_URL } from "./site";

/** What the owner's phone says when a driver accepts: CLAIM NOW (claim lane) or the bid to place (bid lane). */
async function ownerAcceptedLine(load: LoadForRanking & { lane: string; listedCents: number | null; pickupZip: string; dropoffZip: string }, profileId: string, name: string): Promise<string> {
  const link = `${process.env.NEXT_PUBLIC_SITE_URL || SITE_URL}/admin/dispatch/${load.id}`;
  const c = (await rankCandidates(load)).find((x) => x.profileId === profileId);
  const miles = c?.milesToPickup ?? null;
  const where = `${load.pickupZip} → ${load.dropoffZip}`;
  if (load.lane !== "BID") return `✅ ${name} ACCEPTED ${where} (${miles ?? "?"} mi away) — CLAIM NOW in Curri, then tap "Claimed in Curri":\n${link}`;
  if (miles === null || load.tripMiles === null) return `✅ ${name} ACCEPTED ${where} — place the bid in Curri:\n${link}`;
  const cpm = await driverCostPerMile(profileId);
  const s = suggestBid({ tripMiles: load.tripMiles, milesToPickup: miles, costPerMile: cpm.value, costPerMileSource: cpm.source, listedCents: load.listedCents });
  return `✅ ${name} ACCEPTED ${where} (${miles} mi away) — place bid $${s.suggested} (floor $${s.floor}) in Curri:\n${link}`;
}
import { notifyOwner } from "./dispatch-notify";

// The driver side of dispatch on Telegram (stage 1b): linking a driver's
// private chat to their account, Active / Inactive by command, and the Accept /
// Pass buttons on bid-lane offers. Runs before the community FAQ bot in the
// webhook; returns true when it handled the update.

const LINK_MINUTES = 15;

// ---- Link tokens: userId.exp.sig, signed with AUTH_SECRET -----------------

function secret(): string | null {
  return process.env.AUTH_SECRET?.trim() || null;
}
const sign = (payload: string, s: string) => createHmac("sha256", s).update(`tg-link:${payload}`).digest("base64url");

export function createTelegramLinkToken(userId: string, now = Date.now()): string | null {
  const s = secret();
  if (!s) return null;
  const exp = now + LINK_MINUTES * 60_000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload, s)}`;
}

export function verifyTelegramLinkToken(token: string, now = Date.now()): string | null {
  const s = secret();
  const m = /^([a-z0-9]+)\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(token.trim());
  if (!s || !m) return null;
  const [, userId, exp, sig] = m;
  if (Number(exp) < now) return null;
  const expected = sign(`${userId}.${exp}`, s);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}

/** The t.me deep link the fleet page opens. Null when the bot or secret isn't configured. */
export function telegramLinkUrl(userId: string): string | null {
  const bot = telegramBotUsername();
  const token = createTelegramLinkToken(userId);
  return bot && token ? `https://t.me/${bot}?start=${encodeURIComponent(token)}` : null;
}

// ---- Updates ----------------------------------------------------------------

export type DispatchTelegramUpdate = {
  update_id: number;
  message?: { message_id: number; from?: { id: number }; chat: { id: number; type: string }; text?: string };
  callback_query?: { id: string; from: { id: number }; data?: string; message?: { message_id: number; chat: { id: number } } };
};

const HELP = "This bot sends you fleet load offers.\n/active — send me offers (defaults: 8 h, 30 mi, 150 mi trips)\n/active 10 40 200 — hours, radius, max trip\n/inactive — stop offers\n/status — what you're set to\n/unlink — disconnect\n\nWhen an offer comes in, tap Accept or Pass. First to accept gets the load.";

async function linkedProfile(chatId: string) {
  return prisma.user.findUnique({
    where: { telegramChatId: chatId },
    select: { id: true, fleetJoinedAt: true, driverProfile: { select: { id: true, firstName: true, baseZip: true, vehicleType: true, onDutyUntil: true, dutyRadiusMiles: true, dutyMaxTripMiles: true, curriActivatedAt: true } } },
  });
}

/** Returns true when the update was a dispatch concern and has been handled. */
export async function handleDispatchUpdate(update: DispatchTelegramUpdate): Promise<boolean> {
  if (update.callback_query) return handleCallback(update.callback_query);
  const m = update.message;
  if (!m?.from || m.chat.type !== "private") return false;
  const chatId = String(m.chat.id);
  const text = (m.text ?? "").trim();
  if (!text) return false;

  const start = /^\/start(?:@\w+)?\s+(\S+)$/.exec(text);
  if (start) return handleStart(chatId, start[1]);

  const cmd = /^\/(active|inactive|onduty|offduty|status|unlink|help)(?:@\w+)?(?:\s+(.*))?$/i.exec(text);
  if (!cmd) {
    // A linked driver chatting with the bot gets the help text; the owner's own commands pass through.
    if (chatId === telegramOwnerChatId()) return false;
    const u = await linkedProfile(chatId);
    if (!u) return false;
    await sendTelegramMessage(chatId, HELP);
    return true;
  }
  if (chatId === telegramOwnerChatId() && cmd[1].toLowerCase() === "status") return false; // owner's bot /status

  const u = await linkedProfile(chatId);
  if (!u?.driverProfile) {
    await sendTelegramMessage(chatId, "This chat isn't linked to a FlowSync account yet. Open your account → Curri fleet → Connect Telegram.");
    return true;
  }
  if (!u.fleetJoinedAt) {
    await sendTelegramMessage(chatId, "Fleet members only.");
    return true;
  }
  const p = u.driverProfile;
  // /onduty and /offduty are the old names for /active and /inactive.
  const command = ({ onduty: "active", offduty: "inactive" } as Record<string, string>)[cmd[1].toLowerCase()] ?? cmd[1].toLowerCase();
  switch (command) {
    case "help":
      await sendTelegramMessage(chatId, HELP);
      return true;
    case "unlink":
      await prisma.user.update({ where: { id: u.id }, data: { telegramChatId: null } });
      await sendTelegramMessage(chatId, "Disconnected. You can reconnect any time from your account.");
      return true;
    case "status": {
      const on = !!p.onDutyUntil && p.onDutyUntil > new Date();
      await sendTelegramMessage(chatId, on
        ? `Active until ${p.onDutyUntil!.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })} PT · ${p.dutyRadiusMiles ?? DUTY_DEFAULTS.radiusMiles} mi from ${p.baseZip ?? "(no ZIP)"} · trips up to ${p.dutyMaxTripMiles ?? DUTY_DEFAULTS.maxTripMiles} mi`
        : `Inactive. Base ZIP ${p.baseZip ?? "(not set)"} · vehicle ${p.vehicleType || "(not set)"}${p.curriActivatedAt ? "" : " · not activated on Curri yet"}`);
      return true;
    }
    case "inactive":
      await setDuty(p.id, null);
      await sendTelegramMessage(chatId, "Inactive. You won't get load offers until you send /active.");
      return true;
    case "active": {
      if (!p.curriActivatedAt) { await sendTelegramMessage(chatId, "You're not activated on the Curri carrier account yet — Nas will let you know when you are."); return true; }
      if (!p.baseZip) { await sendTelegramMessage(chatId, "Add your home base ZIP first: account → Edit profile → Vehicle."); return true; }
      const nums = (cmd[2] ?? "").split(/\s+/).map(Number).filter((n) => Number.isFinite(n) && n > 0);
      const hours = nums[0] ?? DUTY_DEFAULTS.shiftHours;
      const radiusMiles = nums[1] ?? p.dutyRadiusMiles ?? DUTY_DEFAULTS.radiusMiles;
      const maxTripMiles = nums[2] ?? p.dutyMaxTripMiles ?? DUTY_DEFAULTS.maxTripMiles;
      await setDuty(p.id, { hours, radiusMiles, maxTripMiles });
      await sendTelegramMessage(chatId, `Active for ${Math.min(24, Math.max(1, Math.round(hours)))} h · offers within ${radiusMiles} mi of ${p.baseZip} · trips up to ${maxTripMiles} mi.\nOffers arrive here with Accept / Pass. First to accept gets the load. You switch off automatically after ${Math.min(24, Math.max(1, Math.round(hours)))} h, or send /inactive.`);
      return true;
    }
  }
  return false;
}

async function handleStart(chatId: string, token: string): Promise<boolean> {
  const userId = verifyTelegramLinkToken(token);
  if (!userId) {
    await sendTelegramMessage(chatId, "That link has expired. Open your account → Curri fleet → Connect Telegram and try again.");
    return true;
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, fleetJoinedAt: true, driverProfile: { select: { firstName: true } } } });
  if (!user?.fleetJoinedAt) {
    await sendTelegramMessage(chatId, "Fleet members only.");
    return true;
  }
  // One chat per account, one account per chat.
  await prisma.user.updateMany({ where: { telegramChatId: chatId, id: { not: userId } }, data: { telegramChatId: null } });
  await prisma.user.update({ where: { id: userId }, data: { telegramChatId: chatId } });
  await sendTelegramMessage(chatId, `Linked, ${user.driverProfile?.firstName ?? "driver"}. Fleet loads will come to this chat.\n\n${HELP}`);
  return true;
}

async function handleCallback(q: NonNullable<DispatchTelegramUpdate["callback_query"]>): Promise<boolean> {
  const m = /^offer:([A-Za-z0-9_-]+):(accept|pass)$/.exec(q.data ?? "");
  if (!m) return false;
  const [, offerId, action] = m;
  const chatId = String(q.message?.chat.id ?? q.from.id);
  const u = await linkedProfile(chatId);
  if (!u?.driverProfile) {
    await answerTelegramCallback(q.id, "This chat isn't linked to your account.");
    return true;
  }
  const offer = await prisma.dispatchOffer.findUnique({ where: { id: offerId }, select: { driverProfileId: true, loadId: true, driverProfile: { select: { firstName: true, lastName: true } } } });
  if (!offer || offer.driverProfileId !== u.driverProfile.id) {
    await answerTelegramCallback(q.id, "That offer isn't yours.");
    return true;
  }
  const r = await respondOffer(offerId, action === "accept" ? "ACCEPTED" : "PASSED", u.id);
  const name = `${offer.driverProfile.firstName} ${offer.driverProfile.lastName}`.trim();
  if (r.ok) {
    const load = await prisma.dispatchLoad.findUnique({ where: { id: offer.loadId } });
    const claim = load?.lane !== "BID";
    await answerTelegramCallback(q.id, action === "accept" ? "You've got it ✅" : "Passed.");
    await sendTelegramMessage(chatId, action === "accept"
      ? claim
        ? "✅ You've got it. We're claiming it in Curri now — you'll get CONFIRMED here in a moment."
        : "✅ You've got it. We're placing the bid in Curri now — you'll hear back here when it's awarded."
      : "Passed. No problem.");
    if (action === "accept" && load) await notifyOwner(await ownerAcceptedLine(load, offer.driverProfileId, name));
    else if (action === "pass") await notifyOwner(`${name} passed on ${load ? `${load.pickupZip} → ${load.dropoffZip}` : offer.loadId}.`);
  } else {
    const why = /Taken|assigned/i.test(r.error) ? "Taken — someone was faster." : /expired/i.test(r.error) ? "This offer expired." : r.error;
    await answerTelegramCallback(q.id, why);
    await sendTelegramMessage(chatId, why);
  }
  return true;
}
