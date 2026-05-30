/**
 * Import drivers from the OLD Stripe account (the broken first site) into the
 * new FlowSync DB. Idempotent: skips anyone already present.
 *
 *   # safe first — counts + previews, writes nothing, sends nothing
 *   node --env-file=.env.local scripts/import-old-stripe-drivers.mjs --dry-run
 *
 *   # actually create accounts + send the welcome email
 *   node --env-file=.env.local scripts/import-old-stripe-drivers.mjs --apply
 *
 * Optional flags:
 *   --limit=N      process only the first N customers (for safe partial runs)
 *   --no-email     create accounts but don't send the welcome email
 *
 * Required env (in .env.local — DON'T commit it):
 *   OLD_STRIPE_SECRET_KEY    secret key from the OLD Stripe account
 *   DATABASE_URL_UNPOOLED    Neon direct URL for the NEW prod DB
 *   RESEND_API_KEY           Resend key
 *   RESEND_FROM_EMAIL        verified sender, e.g. "Sean <sean@flowsyncdriver.com>"
 *   ADMIN_EMAILS             (optional) comma list — skipped
 *   SIGNOFF_NAME             (optional) owner's first name — defaults to "FlowSync"
 *
 * What it creates per imported customer:
 *   - User (role=DRIVER, mustResetPassword=true, emailVerified=now,
 *     stripeCustomerId=<old customer id>)
 *   - Payment (type=LISTING, amount=1700, status=PAID,
 *     stripeSessionId="legacy_<customerId>") — so they count as a paid driver
 *     in the engagement panel + future email blasts.
 *   - NO DriverProfile — they go through /account/setup on first sign-in so
 *     their service/name/vehicle are honest, not guessed.
 *
 * Welcome email gives them their temp password + sign-in link + 60-second
 * what-to-expect; the future re-engagement script (Roadmap/referral) will pick
 * them up automatically once they're in.
 */
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { randomBytes, scryptSync } from "node:crypto";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const arg = (name, def) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : def;
};

const DRY_RUN = has("--dry-run");
const APPLY = has("--apply");
const NO_EMAIL = has("--no-email");
const LIMIT = Number(arg("limit", "0")) || 0;

if (!DRY_RUN && !APPLY) {
  console.error("Pass either --dry-run or --apply.");
  process.exit(1);
}

for (const k of ["OLD_STRIPE_SECRET_KEY", "DATABASE_URL_UNPOOLED"]) {
  if (!process.env[k]) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}
if (APPLY && !NO_EMAIL) {
  for (const k of ["RESEND_API_KEY", "RESEND_FROM_EMAIL"]) {
    if (!process.env[k]) {
      console.error(`Missing env: ${k} (required unless --no-email)`);
      process.exit(1);
    }
  }
}

const ADMINS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const SIGNOFF = process.env.SIGNOFF_NAME ?? "FlowSync";

const stripe = new Stripe(process.env.OLD_STRIPE_SECRET_KEY);
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED } },
});
const resend = APPLY && !NO_EMAIL ? new Resend(process.env.RESEND_API_KEY) : null;

// Match src/lib/password.ts exactly — User.hashedPassword format is "<saltHex>:<hashHex>".
function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
const tempPassword = () => randomBytes(12).toString("base64url");

const SIGN_IN_URL = "https://flowsyncdriver.com/signin";
const SUBJECT = "Welcome back to FlowSync — your new login";

const esc = (s) =>
  String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

const renderText = (firstName, email, tempPw) => `Hey ${firstName || "there"},

You paid for a FlowSync driver listing on the original site. That site had problems we couldn't fix, so we rebuilt the whole platform from scratch at flowsyncdriver.com.

Your listing is restored. Here's your login:

Email: ${email}
Temporary password: ${tempPw}

→ Sign in: ${SIGN_IN_URL}

After you sign in, you'll set a new password, then take 60 seconds to complete your profile (your name, your service, your vehicle). Once that's done you're back in the directory — and you've got two new things waiting:

• Your Roadmap — a step-by-step plan to get your first bookings
• A referral link — refer 3 drivers and your account upgrades to Premium ($97 value) for free

I read every reply. If something isn't right, just hit reply.

${SIGNOFF}
FlowSync`;

const renderHtml = (firstName, email, tempPw) => `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;font-size:16px;line-height:1.55;max-width:560px">
  <p>Hey ${esc(firstName || "there")},</p>
  <p>You paid for a FlowSync driver listing on the original site. That site had problems we couldn't fix, so we rebuilt the whole platform from scratch at flowsyncdriver.com.</p>
  <p>Your listing is restored. Here's your login:</p>
  <p style="background:#f5f5f5;border-radius:8px;padding:14px 16px;font-family:ui-monospace,monospace;font-size:14px;line-height:1.7">
    Email: <strong>${esc(email)}</strong><br/>
    Temporary password: <strong>${esc(tempPw)}</strong>
  </p>
  <p><a href="${SIGN_IN_URL}" style="display:inline-block;background:#25e07a;color:#04130a;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">Sign in →</a></p>
  <p>After you sign in, you'll set a new password, then take 60 seconds to complete your profile (your name, your service, your vehicle). Once that's done you're back in the directory — and you've got two new things waiting:</p>
  <ul>
    <li><strong>Your Roadmap</strong> — a step-by-step plan to get your first bookings</li>
    <li><strong>A referral link</strong> — refer 3 drivers and your account upgrades to Premium ($97 value) for free</li>
  </ul>
  <p>I read every reply. If something isn't right, just hit reply.</p>
  <p>${esc(SIGNOFF)}<br/>FlowSync</p>
</div>`;

async function sendWelcome(email, firstName, tempPw) {
  if (!resend) return { skipped: true };
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: SUBJECT,
    html: renderHtml(firstName, email, tempPw),
    text: renderText(firstName, email, tempPw),
  });
  if (error) throw new Error(error.message ?? String(error));
  return { ok: true };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function splitName(name) {
  if (!name) return { first: "", last: "" };
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

async function main() {
  console.log(`\nFlowSync old-Stripe driver import — ${APPLY ? "APPLY (live)" : "DRY RUN"}${NO_EMAIL ? " [no-email]" : ""}`);
  console.log(LIMIT ? `Limit: first ${LIMIT} customers\n` : "");

  let seen = 0;
  let toCreate = 0;
  let created = 0;
  let skippedExisting = 0;
  let skippedNoEmail = 0;
  let skippedAdmin = 0;
  let failed = 0;
  const previews = [];
  const start = Date.now();

  for await (const c of stripe.customers.list({ limit: 100 })) {
    if (LIMIT && seen >= LIMIT) break;
    seen++;

    const rawEmail = (c.email ?? "").trim();
    if (!rawEmail) {
      skippedNoEmail++;
      continue;
    }
    const email = rawEmail.toLowerCase();
    if (ADMINS.includes(email)) {
      skippedAdmin++;
      continue;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { stripeCustomerId: c.id }] },
      select: { id: true },
    });
    if (existing) {
      skippedExisting++;
      continue;
    }

    const { first, last } = splitName(c.name);

    if (!APPLY) {
      toCreate++;
      if (previews.length < 5) {
        const domain = email.split("@")[1] ?? "?";
        previews.push(`${first || "(no name)"} @${domain}`);
      }
      continue;
    }

    // Live mode: create user + payment, then send welcome.
    try {
      const pw = tempPassword();
      const name = [first, last].filter(Boolean).join(" ") || null;
      await prisma.user.create({
        data: {
          email,
          name,
          role: "DRIVER",
          stripeCustomerId: c.id,
          hashedPassword: hashPassword(pw),
          mustResetPassword: true,
          emailVerified: new Date(),
          payments: {
            create: {
              type: "LISTING",
              amount: 1700,
              currency: "usd",
              status: "PAID",
              bumps: [],
              stripeSessionId: `legacy_${c.id}`,
            },
          },
        },
      });

      if (!NO_EMAIL) {
        try {
          await sendWelcome(email, first, pw);
        } catch (e) {
          // Account is created; only the email failed. Don't roll back — they
          // can be re-emailed separately. Just log and move on.
          console.error(`! welcome email failed for ${email}: ${e.message}`);
        }
        await sleep(250);
      }

      created++;
    } catch (e) {
      failed++;
      console.error(`! create failed for ${email}: ${e.message}`);
    }
  }

  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log("\n--- Summary ---");
  console.log(`Customers seen:    ${seen}`);
  console.log(`No email:          ${skippedNoEmail}`);
  console.log(`Admin (skipped):   ${skippedAdmin}`);
  console.log(`Already in new DB: ${skippedExisting}`);
  if (APPLY) {
    console.log(`Created:           ${created}`);
    console.log(`Failed:            ${failed}`);
  } else {
    console.log(`Would create:      ${toCreate}`);
    console.log(`\nFirst 5 new (firstName + email domain only — no full addresses):`);
    for (const p of previews) console.log(`  - ${p}`);
    console.log(`\nSubject: ${SUBJECT}`);
    console.log(`From:    ${process.env.RESEND_FROM_EMAIL ?? "(RESEND_FROM_EMAIL not set)"}`);
    console.log(`Signoff: ${SIGNOFF}`);
    console.log(`\nPreview body (firstName='Marcus', temp='abc123XYZ'):\n`);
    console.log(renderText("Marcus", "marcus@example.com", "abc123XYZ"));
    console.log(`\n[DRY RUN] Nothing was written. Re-run with --apply when ready.`);
  }
  console.log(`\nRuntime: ${seconds}s`);
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
