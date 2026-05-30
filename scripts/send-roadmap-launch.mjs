/**
 * One-off re-engagement email to FlowSync's paid drivers announcing the new
 * Driver Roadmap + referral-for-free-Premium program. Sends via the existing
 * Resend setup, personalized per recipient.
 *
 *   # safe first — prints audience size + a preview, sends nothing
 *   node --env-file=.env.local scripts/send-roadmap-launch.mjs --dry-run
 *
 *   # actually send (after confirming the dry-run looks right)
 *   node --env-file=.env.local scripts/send-roadmap-launch.mjs --send
 *
 * Required env (in .env.local — do NOT commit it):
 *   DATABASE_URL_UNPOOLED  Neon direct URL (not the pooled one; this script is long-running)
 *   RESEND_API_KEY         Resend API key
 *   RESEND_FROM_EMAIL      Verified Resend sender, e.g. "Sean <sean@flowsyncdriver.com>"
 *   ADMIN_EMAILS           (optional) comma list — these recipients are skipped
 *   SIGNOFF_NAME           (optional) e.g. "Sean" — defaults to "FlowSync"
 *
 * Audience: drivers with role=DRIVER, ≥1 PAID Payment, a profile with firstName.
 * Excluded: admin emails, common test domains (@test.com / @reftest.com / @city.com),
 * "+test" emails.
 */
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const DRY_RUN = process.argv.includes("--dry-run");
const SEND = process.argv.includes("--send");
if (!DRY_RUN && !SEND) {
  console.error("Pass either --dry-run or --send.");
  process.exit(1);
}

for (const k of ["DATABASE_URL_UNPOOLED", "RESEND_API_KEY", "RESEND_FROM_EMAIL"]) {
  if (!process.env[k]) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

const SIGNOFF = process.env.SIGNOFF_NAME ?? "FlowSync";
const ADMINS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED } },
});
const resend = new Resend(process.env.RESEND_API_KEY);

const SUBJECT = "Refer 3 drivers, get Premium free (no catch)";
const ROADMAP_URL = "https://flowsyncdriver.com/account/roadmap";

const isTestEmail = (email) => {
  const e = email.toLowerCase();
  return (
    e.endsWith("@test.com") ||
    e.endsWith("@reftest.com") ||
    e.endsWith("@city.com") ||
    e.includes("+test")
  );
};

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

const renderText = (firstName) => `Hey ${firstName || "there"},

Quick one — your FlowSync account just got a referral program.

Your account has a unique link. Every driver who joins through it counts toward your free Premium upgrade ($97 value) — refer 3 and it's yours, on the house.

The part most drivers miss: that same link also brings in *customers*. Anyone you share it with who books a delivery pays you directly through your FlowSync profile — you keep 95%.

5 minutes of sharing today = a permanent Premium upgrade + new bookings on autopilot.

Grab your link (and check out the new Roadmap that walks you through getting your first jobs):
${ROADMAP_URL}

I read every reply. Anything broken? Ideas? Just hit reply.

${SIGNOFF}
FlowSync`;

const renderHtml = (firstName) => `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;font-size:16px;line-height:1.55;max-width:560px">
  <p>Hey ${esc(firstName || "there")},</p>
  <p>Quick one — your FlowSync account just got a referral program.</p>
  <p>Your account has a unique link. Every driver who joins through it counts toward your free Premium upgrade ($97 value) — refer 3 and it's yours, on the house.</p>
  <p>The part most drivers miss: that same link also brings in <em>customers</em>. Anyone you share it with who books a delivery pays you directly through your FlowSync profile — you keep 95%.</p>
  <p>5 minutes of sharing today = a permanent Premium upgrade + new bookings on autopilot.</p>
  <p>Grab your link (and check out the new Roadmap that walks you through getting your first jobs):</p>
  <p><a href="${ROADMAP_URL}" style="display:inline-block;background:#25e07a;color:#04130a;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">Open your Roadmap →</a></p>
  <p>I read every reply. Anything broken? Ideas? Just hit reply.</p>
  <p>${esc(SIGNOFF)}<br/>FlowSync</p>
</div>`;

async function loadRecipients() {
  const users = await prisma.user.findMany({
    where: {
      role: "DRIVER",
      payments: { some: { status: "PAID" } },
      driverProfile: { isNot: null },
    },
    include: { driverProfile: { select: { firstName: true } } },
  });
  return users
    .filter((u) => u.driverProfile?.firstName)
    .filter((u) => !ADMINS.includes(u.email.toLowerCase()))
    .filter((u) => !isTestEmail(u.email))
    .map((u) => ({ email: u.email, firstName: u.driverProfile.firstName }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const recipients = await loadRecipients();
  console.log(`Audience: ${recipients.length} paid driver${recipients.length === 1 ? "" : "s"}`);

  if (DRY_RUN) {
    console.log("\nFirst 5 (firstName + email domain only — no full addresses):");
    for (const r of recipients.slice(0, 5)) {
      const domain = r.email.split("@")[1] ?? "?";
      console.log(`  - ${r.firstName} @${domain}`);
    }
    console.log(`\nSubject: ${SUBJECT}`);
    console.log(`From: ${process.env.RESEND_FROM_EMAIL}`);
    console.log(`Signoff: ${SIGNOFF}`);
    console.log("\nPreview body (rendered for firstName='Marcus'):\n");
    console.log(renderText("Marcus"));
    console.log("\n[DRY RUN] No emails sent. Re-run with --send when this looks right.");
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL;
  let sent = 0;
  const failed = [];
  const start = Date.now();

  for (const r of recipients) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: r.email,
        subject: SUBJECT,
        html: renderHtml(r.firstName),
        text: renderText(r.firstName),
      });
      if (error) failed.push({ email: r.email, error: error.message ?? String(error) });
      else sent++;
    } catch (e) {
      failed.push({ email: r.email, error: e?.message ?? String(e) });
    }
    await sleep(250); // 4 req/s — well under Resend's default rate limit
  }

  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nSent:    ${sent}`);
  console.log(`Failed:  ${failed.length}`);
  console.log(`Runtime: ${seconds}s`);
  if (failed.length) {
    const themes = {};
    for (const f of failed) {
      const domain = f.email.split("@")[1] ?? "?";
      themes[domain] = (themes[domain] ?? 0) + 1;
    }
    console.log("\nFailures by domain:");
    for (const [d, n] of Object.entries(themes).sort((a, b) => b[1] - a[1])) {
      console.log(`  @${d}: ${n}`);
    }
    const sampleErrs = [...new Set(failed.map((f) => f.error))].slice(0, 5);
    console.log("\nSample error messages:");
    for (const e of sampleErrs) console.log(`  - ${e}`);
  }
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
