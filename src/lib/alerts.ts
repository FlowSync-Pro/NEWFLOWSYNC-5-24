import { adminEmails } from "@/lib/admin";
import { sendOwnerAlertEmail } from "@/lib/email";

// Owner alerts for things that need a human soon: an abandoned checkout worth
// a text, a new fleet member to onboard by hand, and — the one that costs
// money — a paying driver whose welcome email didn't send.
//
// Sent by email to every address in ADMIN_EMAILS (owner decision 2026-10-01;
// these used to go over Telegram). Caveat: the "welcome email FAILED" alert
// travels on the same email service that just failed, so if Resend itself is
// down that alert won't arrive either. That's why every alert is ALSO written
// to the server log first — Vercel → Logs, search "[alert]".
//
// Never throws. Callers are Stripe webhooks — a failed alert must never fail a
// fulfillment or cause Stripe to retry a charge.

export async function alertOwner(message: string): Promise<void> {
  // Always log, so the signal exists in Vercel logs even if email fails.
  console.error(`[alert] ${message}`);

  const to = adminEmails();
  if (to.length === 0) return;

  try {
    await sendOwnerAlertEmail(to, message);
  } catch (e) {
    console.error("[alert] email notify failed:", e instanceof Error ? e.message : e);
  }
}
