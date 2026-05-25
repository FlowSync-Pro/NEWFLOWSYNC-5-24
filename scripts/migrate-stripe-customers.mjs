/**
 * Migrate existing Stripe customers into FlowSync accounts.
 *
 * Run with env loaded (Node 20+):
 *   node --env-file=.env scripts/migrate-stripe-customers.mjs            # DRY RUN (default)
 *   node --env-file=.env scripts/migrate-stripe-customers.mjs --apply    # really create + email
 *
 * Flags:
 *   --apply         perform writes + send emails (otherwise dry run, no changes)
 *   --limit=N       only process the first N customers
 *   --role=DRIVER   account role to create (default DRIVER)
 *   --demo          use built-in fake customers instead of Stripe (for local testing)
 *
 * Safety: dry run by default; idempotent (skips emails/customers already migrated);
 * email/DB failures are logged per-customer and don't abort the run.
 */
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { randomBytes, scryptSync } from "node:crypto";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (name, def) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : def;
};

const APPLY = has("--apply");
const DEMO = has("--demo");
const LIMIT = Number(val("limit", "0")) || 0;
const ROLE = (val("role", "DRIVER") || "DRIVER").toUpperCase();

const prisma = new PrismaClient();
const resendKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL;
const resend = resendKey ? new Resend(resendKey) : null;
const base = process.env.NEXT_PUBLIC_SITE_URL || "https://flowsyncdriver.com";

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
const tempPassword = () => randomBytes(6).toString("base64url");

async function sendEmail(to, tempPw) {
  const subject = "Your FlowSync account is ready";
  const html = `<!doctype html><html><body style="margin:0;background:#07090b;font-family:Arial,sans-serif;color:#e7ecef">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px">
      <div style="font-size:20px;font-weight:800;color:#25e07a;margin-bottom:24px">FlowSync</div>
      <div style="background:#0e1316;border:1px solid #1d262b;border-radius:16px;padding:28px">
        <h1 style="font-size:22px;margin:0 0 12px">Your account is ready</h1>
        <p style="color:#aebac1;line-height:1.6">We've moved you to the new FlowSync. Sign in with this temporary password and set a new one:</p>
        <div style="background:#11181c;border:1px solid #1d262b;border-radius:12px;padding:14px;margin:14px 0;text-align:center;font-size:18px;font-weight:700;letter-spacing:1px;color:#25e07a">${tempPw}</div>
        <a href="${base}/signin" style="display:inline-block;background:#25e07a;color:#04130a;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:999px">Sign in to FlowSync</a>
      </div>
    </div></body></html>`;
  if (!resend || !resendFrom) {
    console.log(`   [email skipped — no Resend key] would email ${to}`);
    return;
  }
  await resend.emails.send({ from: resendFrom, to, subject, html });
}

const DEMO_CUSTOMERS = [
  { id: "cus_demo_1", email: "demo.customer1@example.com", name: "Demo One" },
  { id: "cus_demo_2", email: "demo.customer2@example.com", name: "Demo Two" },
];

async function* customers() {
  if (DEMO) {
    for (const c of DEMO_CUSTOMERS) yield c;
    return;
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  for await (const c of stripe.customers.list({ limit: 100 })) {
    yield { id: c.id, email: c.email, name: c.name };
  }
}

async function main() {
  console.log(`\nFlowSync customer migration — ${APPLY ? "APPLY (live)" : "DRY RUN"}${DEMO ? " [demo source]" : ""}`);
  console.log(`role=${ROLE}${LIMIT ? ` limit=${LIMIT}` : ""}\n`);

  let seen = 0, created = 0, skippedNoEmail = 0, skippedExisting = 0, failed = 0;

  for await (const c of customers()) {
    if (LIMIT && seen >= LIMIT) break;
    seen++;
    if (!c.email) { skippedNoEmail++; continue; }
    const email = c.email.toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { stripeCustomerId: c.id }] },
      select: { id: true },
    });
    if (existing) { console.log(`= exists   ${email}`); skippedExisting++; continue; }

    if (!APPLY) { console.log(`+ would create + email   ${email}`); created++; continue; }

    try {
      const pw = tempPassword();
      await prisma.user.create({
        data: {
          email,
          name: c.name || null,
          role: ROLE,
          stripeCustomerId: c.id,
          hashedPassword: hashPassword(pw),
          mustResetPassword: true,
          emailVerified: new Date(),
        },
      });
      await sendEmail(email, pw);
      console.log(`+ created  ${email}`);
      created++;
    } catch (e) {
      console.error(`! failed   ${email}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nSummary: seen=${seen} ${APPLY ? "created" : "would-create"}=${created} existing=${skippedExisting} no-email=${skippedNoEmail} failed=${failed}`);
  if (!APPLY) console.log("DRY RUN — no accounts created and no emails sent. Re-run with --apply to perform.\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
