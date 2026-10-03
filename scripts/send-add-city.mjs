/**
 * One-time "Add your city" email (owner-approved copy, 2026-10-03) to listed
 * drivers who have no city on their profile — the city × service pages
 * (/delivery/[service]/[city]) only exist once drivers add one.
 *
 *   # safe first — prints audience size + a preview, sends nothing
 *   node --env-file=.env.local scripts/send-add-city.mjs --dry-run
 *
 *   # actually send (after the dry run looks right)
 *   node --env-file=.env.local scripts/send-add-city.mjs --send
 *
 * Required env (in .env.local — never commit it):
 *   DATABASE_URL_UNPOOLED  Neon direct URL (not the pooled one)
 *   RESEND_API_KEY         Resend API key
 *   RESEND_FROM_EMAIL      Verified Resend sender, e.g. "Nasser <hello@flowsyncdriver.com>"
 *   AUTH_SECRET            Same value as production — signs the unsubscribe links
 *   ADMIN_EMAILS           (optional) comma list — these recipients are skipped
 *   SIGNOFF_NAME           (optional) defaults to "Nasser"
 *
 * Audience: role=DRIVER, verified profile with a primary service and NO city.
 * Skipped: unsubscribed (marketingOptOutAt), refunded, admin/support/test
 * accounts, and anyone who already got this email (EmailLog kind below — the
 * unique (user, kind) row is claimed BEFORE sending, so re-running the script
 * can never double-send). Same rules as src/lib/marketing.ts.
 *
 * Writes only EmailLog rows (our own bookkeeping). Touches no driver data.
 */
import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const DRY_RUN = process.argv.includes("--dry-run");
const SEND = process.argv.includes("--send");
if (!DRY_RUN && !SEND) {
  console.error("Pass either --dry-run or --send.");
  process.exit(1);
}
for (const k of ["DATABASE_URL_UNPOOLED", "RESEND_API_KEY", "RESEND_FROM_EMAIL", "AUTH_SECRET"]) {
  if (!process.env[k]) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

// Keep these three in sync with src/lib/site.ts.
const SITE_URL = "https://flowsyncdriver.com";
const SUPPORT_EMAIL = "support@flowsyncdriver.com";
const POSTAL_ADDRESS = "8217 Sheffield Ln, Bakersfield, CA 93311";

const KIND = "add-city-2026-10"; // EmailLog kind — one per driver, ever
const SUBJECT = "Add your city so customers can find you";
const EDIT_URL = `${SITE_URL}/account/edit`;
const SIGNOFF = process.env.SIGNOFF_NAME ?? "Nasser";
const ADMINS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED } } });
const resend = new Resend(process.env.RESEND_API_KEY);

// Same token the site's /api/unsubscribe route verifies (src/lib/marketing.ts).
const unsubscribeUrl = (userId) => {
  const sig = createHmac("sha256", process.env.AUTH_SECRET).update(`unsubscribe:${userId}`).digest("base64url");
  return `${SITE_URL}/api/unsubscribe?t=${encodeURIComponent(`${userId}.${sig}`)}`;
};

const isTestEmail = (email) => {
  const e = email.toLowerCase();
  return e.endsWith("@test.com") || e.endsWith("@reftest.com") || e.endsWith("@city.com") || e.endsWith(".example") || e.includes("+test");
};

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

const renderText = (firstName, unsub) => `Hi ${firstName || "there"},

Quick one. FlowSync now has a page for every city with drivers on it — the pages customers find when they search things like "courier in Bakersfield". Your profile isn't on yours yet, because there's no city on it.

It takes about 20 seconds:

1. Sign in and open Edit profile: ${EDIT_URL}
2. Type your city and state in the new City box (for example: Bakersfield, CA)
3. Hit Save

That's it. Your profile shows up on your city's page right away, and customers searching your area can book you directly.

If you cover more than one city, put the one you want to be found in first. Reply to this email if anything's unclear — I read every one.

${SIGNOFF}
FlowSync Drivers

--
Barham Transport LLC · ${POSTAL_ADDRESS}
You're getting this because you have a FlowSync driver account. Unsubscribe from tips and offers: ${unsub}
You'll still get emails about your account and payments.`;

const renderHtml = (firstName, unsub) => `<!doctype html><html><body style="margin:0;background:#07090b;font-family:Arial,Helvetica,sans-serif;color:#e7ecef">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="font-size:20px;font-weight:800;color:#25e07a;margin-bottom:24px">FlowSync</div>
    <div style="background:#0e1316;border:1px solid #1d262b;border-radius:16px;padding:28px;font-size:16px;line-height:1.55">
      <h1 style="font-size:22px;margin:0 0 12px">Add your city so customers can find you</h1>
      <p>Hi ${esc(firstName || "there")},</p>
      <p>Quick one. FlowSync now has a page for every city with drivers on it &mdash; the pages customers find when they search things like &ldquo;courier in Bakersfield&rdquo;. Your profile isn&rsquo;t on yours yet, because there&rsquo;s no city on it.</p>
      <p>It takes about 20 seconds:</p>
      <ol style="padding-left:20px">
        <li>Sign in and open <strong>Edit profile</strong></li>
        <li>Type your city and state in the new <strong>City</strong> box (for example: Bakersfield, CA)</li>
        <li>Hit <strong>Save</strong></li>
      </ol>
      <p><a href="${EDIT_URL}" style="display:inline-block;background:#25e07a;color:#04130a;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">Add my city &rarr;</a></p>
      <p>That&rsquo;s it. Your profile shows up on your city&rsquo;s page right away, and customers searching your area can book you directly.</p>
      <p>If you cover more than one city, put the one you want to be found in first. Reply to this email if anything&rsquo;s unclear &mdash; I read every one.</p>
      <p>${esc(SIGNOFF)}<br/>FlowSync Drivers</p>
    </div>
    <p style="color:#7c8a92;font-size:12px;line-height:1.5;margin-top:20px">Barham Transport LLC &middot; ${esc(POSTAL_ADDRESS)}<br>You're getting this because you have a FlowSync driver account. <a href="${unsub}" style="color:#7c8a92;text-decoration:underline">Unsubscribe</a> from tips and offers &mdash; you'll still get emails about your account and payments.</p>
  </div></body></html>`;

async function loadRecipients() {
  const users = await prisma.user.findMany({
    where: {
      role: "DRIVER",
      marketingOptOutAt: null,
      driverProfile: { is: { verified: true, primaryService: { not: null }, OR: [{ city: null }, { city: "" }] } },
    },
    select: {
      id: true,
      email: true,
      driverProfile: { select: { firstName: true, city: true } },
      payments: { where: { status: "REFUNDED" }, select: { id: true }, take: 1 },
      emailLogs: { where: { kind: KIND, cancelledAt: null }, select: { id: true } },
    },
  });
  return users
    .filter((u) => u.driverProfile && !(u.driverProfile.city ?? "").trim())
    .filter((u) => u.payments.length === 0)
    .filter((u) => u.emailLogs.length === 0)
    .filter((u) => !ADMINS.includes(u.email.toLowerCase()) && u.email.toLowerCase() !== SUPPORT_EMAIL)
    .filter((u) => !isTestEmail(u.email))
    .map((u) => ({ id: u.id, email: u.email, firstName: u.driverProfile.firstName }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const recipients = await loadRecipients();
  console.log(`Audience: ${recipients.length} listed driver${recipients.length === 1 ? "" : "s"} with no city`);

  if (DRY_RUN) {
    console.log("\nFirst 5 (first name + email domain only):");
    for (const r of recipients.slice(0, 5)) console.log(`  - ${r.firstName} @${r.email.split("@")[1] ?? "?"}`);
    console.log(`\nSubject: ${SUBJECT}`);
    console.log(`From:    ${process.env.RESEND_FROM_EMAIL}`);
    console.log(`Reply-to: ${SUPPORT_EMAIL}`);
    console.log("\nPreview (rendered for firstName='Marcus'):\n");
    console.log(renderText("Marcus", `${SITE_URL}/api/unsubscribe?t=…`));
    console.log("\n[DRY RUN] No emails sent. Re-run with --send when this looks right.");
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL;
  let sent = 0;
  const failed = [];
  const start = Date.now();

  for (const r of recipients) {
    // Claim the (user, kind) slot first so a second run can never double-send.
    let logId;
    try {
      const log = await prisma.emailLog.create({ data: { userId: r.id, kind: KIND } });
      logId = log.id;
    } catch (e) {
      if (e?.code === "P2002") continue; // already sent by an earlier run
      throw e;
    }
    const unsub = unsubscribeUrl(r.id);
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: r.email,
        replyTo: SUPPORT_EMAIL,
        subject: SUBJECT,
        html: renderHtml(r.firstName, unsub),
        text: renderText(r.firstName, unsub),
        headers: {
          "List-Unsubscribe": `<${unsub}>, <mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (error) {
        failed.push({ email: r.email, error: error.message ?? String(error) });
        await prisma.emailLog.delete({ where: { id: logId } }); // nothing went out — free the slot
      } else {
        sent++;
        if (data?.id) await prisma.emailLog.update({ where: { id: logId }, data: { resendId: data.id } });
      }
    } catch (e) {
      failed.push({ email: r.email, error: e?.message ?? String(e) });
      await prisma.emailLog.delete({ where: { id: logId } }).catch(() => {});
    }
    await sleep(250); // 4 req/s — under Resend's rate limit
  }

  console.log(`\nSent:    ${sent}`);
  console.log(`Failed:  ${failed.length}`);
  console.log(`Runtime: ${((Date.now() - start) / 1000).toFixed(1)}s`);
  if (failed.length) {
    const byDomain = {};
    for (const f of failed) byDomain[f.email.split("@")[1] ?? "?"] = (byDomain[f.email.split("@")[1] ?? "?"] ?? 0) + 1;
    console.log("\nFailures by domain:");
    for (const [d, n] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) console.log(`  @${d}: ${n}`);
    console.log("\nSample error messages:");
    for (const e of [...new Set(failed.map((f) => f.error))].slice(0, 5)) console.log(`  - ${e}`);
    console.log("\nFailed recipients were NOT logged, so a re-run with --send retries only them.");
  }
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
