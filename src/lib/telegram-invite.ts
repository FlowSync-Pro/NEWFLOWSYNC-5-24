/**
 * The fleet Telegram group invite, from NEXT_PUBLIC_TELEGRAM_INVITE_URL.
 *
 * Owner decision (2026-10-01): Telegram is mentioned ONLY to Curri fleet
 * members — the fleet guide once they've joined, and the fleet welcome email.
 * Verified and Premium drivers are never shown it. Returns null when the env
 * var is unset or isn't a real https://t.me / telegram.me link, so no surface
 * ever promises a group that doesn't exist.
 */
export function fleetTelegramInviteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TELEGRAM_INVITE_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && /(^|\.)t(elegram)?\.me$/.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}
