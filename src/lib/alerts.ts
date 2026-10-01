import { adminEmails } from "@/lib/admin";
import { sendOwnerAlertEmail, type EmailResult } from "@/lib/email";
import { SUPPORT_EMAIL } from "@/lib/site";

// Owner alerts for things that need a human soon: an abandoned checkout worth
// a text, a new fleet member to onboard by hand, and — the one that costs
// money — a paying driver whose welcome email didn't send.
//
// Sent by email to the support inbox (SUPPORT_EMAIL) plus every ADMIN_EMAILS
// address (owner decision 2026-10-01; these used to go over Telegram). The
// support inbox is a recipient in code ON PURPOSE rather than added to
// ADMIN_EMAILS: that list grants admin access, and anyone can type any email at
// checkout, so an admin address without an account could be claimed by a buyer.
//
// Caveat: the "welcome email FAILED" alert travels on the same email service
// that just failed, so if Resend itself is down that alert won't arrive either. That's why every alert is ALSO written
// to the server log first — Vercel → Logs, search "[alert]".
//
// Never throws. Callers are Stripe webhooks — a failed alert must never fail a
// fulfillment or cause Stripe to retry a charge.

export async function alertOwner(message: string): Promise<void> {
  // Always log, so the signal exists in Vercel logs even if email fails.
  console.error(`[alert] ${message}`);

  const to = [...new Set([SUPPORT_EMAIL, ...adminEmails()].map((e) => e.trim().toLowerCase()))];

  try {
    await sendOwnerAlertEmail(to, message);
  } catch (e) {
    console.error("[alert] email notify failed:", e instanceof Error ? e.message : e);
  }
}

/**
 * Customer email didn't go out → tell the owner who it was for and why, so a
 * driver or customer isn't left waiting in silence. Never throws.
 *
 * Note: owner alerts are themselves emails. If email isn't configured at all,
 * this alert can't be emailed either — it still lands in Vercel → Logs as
 * "[alert]", next to the "[email:skipped]" warning.
 */
export async function alertIfEmailFailed(result: EmailResult): Promise<void> {
  if (result.sent) return;
  const why =
    result.reason === "not-configured"
      ? "Email isn't configured: RESEND_API_KEY or RESEND_FROM_EMAIL is missing in Vercel."
      : 'Resend refused or errored. Vercel → Logs, search "[email]" for the reason.';
  await alertOwner(
    `📭 FlowSync: a customer email didn't send.\n\n` +
      `Email: ${result.subject}\nTo: ${result.to}\n${why}\n\n` +
      `They may be waiting on it. Reach out if it matters.`,
  );
}
