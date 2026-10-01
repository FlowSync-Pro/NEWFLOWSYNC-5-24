/**
 * Send ONE test email through Resend to the support inbox — to check that the
 * Resend API key works. Touches no database, no Stripe, no driver data.
 *
 * The API key is read from RESEND_API_KEY (your .env.local, the same setting
 * Vercel uses). It is never written in code and never printed: a key committed
 * to git can be used by anyone who sees it to send email as FlowSync.
 *
 * Usage (from the project folder):
 *   node --env-file=.env.local scripts/send-test-email.mjs
 *
 * Sender: RESEND_FROM_EMAIL if set (must be on a domain verified in Resend, e.g.
 * "FlowSync <support@flowsyncdriver.com>"), otherwise Resend's shared test
 * sender onboarding@resend.dev. Note: the shared test sender only delivers to
 * the email address that owns the Resend account — if support@flowsyncdriver.com
 * isn't that address, verify flowsyncdriver.com in Resend → Domains first.
 */
import { Resend } from "resend";

const TO = "support@flowsyncdriver.com"; // same as SUPPORT_EMAIL in src/lib/site.ts

const key = process.env.RESEND_API_KEY?.trim();
if (!key) {
  console.error("RESEND_API_KEY is not set. Add it to .env.local (it starts with re_), then run again.");
  process.exit(1);
}

const from = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
const resend = new Resend(key);

console.log(`Sending a test email from ${from} to ${TO} …`);
const { data, error } = await resend.emails.send({
  from,
  to: TO,
  subject: "FlowSync test email",
  html: "<p>Congrats — FlowSync can send email through Resend.</p><p>If you're reading this in the support inbox, sending AND receiving both work.</p>",
});

if (error) {
  console.error(`\n✗ Resend refused it: ${error.message ?? JSON.stringify(error)}`);
  console.error("Common causes: wrong or revoked API key; the sender's domain isn't verified in Resend → Domains;");
  console.error("or you used onboarding@resend.dev to send to an address that doesn't own the Resend account.");
  process.exit(1);
}

console.log(`\n✓ Accepted by Resend (id ${data?.id}). Check ${TO} in a minute — look in spam too.`);
