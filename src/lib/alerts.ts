import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram";

// Owner alerts for silent failures that cost money — specifically, a paying
// driver whose welcome email didn't send (they can't sign in, and until now
// nobody found out).
//
// Deliberately routed over Telegram rather than email: the thing we're most
// often alerting about IS email being broken, so the alert has to travel on a
// different channel. Falls back to a loud console.error (visible in Vercel
// logs) when Telegram isn't configured.
//
// Never throws. Callers are Stripe webhooks — a failed alert must never fail a
// fulfillment or cause Stripe to retry a charge.

export async function alertOwner(message: string): Promise<void> {
  // Always log, so the signal exists in Vercel logs even without Telegram.
  console.error(`[alert] ${message}`);

  const ownerId = process.env.TELEGRAM_OWNER_USER_ID?.trim();
  if (!ownerId || !isTelegramConfigured()) return;

  try {
    await sendTelegramMessage(ownerId, message);
  } catch (e) {
    console.error("[alert] Telegram notify failed:", e instanceof Error ? e.message : e);
  }
}
