/**
 * Import drivers from a CSV export (e.g. Stripe dashboard → Customers → Export).
 * Same end result as scripts/import-old-stripe-drivers.mjs but reads from a CSV
 * file instead of the Stripe API — use this when you'd rather export manually
 * than wrangle an API key.
 *
 *   # safe first — counts + previews, writes nothing, sends nothing
 *   node --env-file=.env.local scripts/import-drivers-from-csv.mjs \
 *     --file=customers.csv --dry-run
 *
 *   # actually create accounts + send welcome emails
 *   node --env-file=.env.local scripts/import-drivers-from-csv.mjs \
 *     --file=customers.csv --apply
 *
 * Optional flags:
 *   --limit=N      process only the first N rows
 *   --no-email     create accounts but don't send the welcome email
 *
 * CSV format:
 *   Must have a header row with an `email` column. `name` (or `Name`, `Customer
 *   Name`, `Full Name`) is optional. Any other columns are ignored — Stripe's
 *   default customer export works as-is.
 *
 * Required env (in .env.local — DON'T commit it):
 *   DATABASE_URL_UNPOOLED    Neon direct URL for the new prod DB
 *   RESEND_API_KEY           Resend key (only needed for --apply)
 *   RESEND_FROM_EMAIL        verified sender, e.g. "Nas <nas@flowsyncdriver.com>"
 *   ADMIN_EMAILS             (optional) comma list — skipped on import
 *   SIGNOFF_NAME             (optional) owner's first name — defaults to "FlowSync"
 *
 * Same behaviour as the API import: creates User + a synthetic PAID Payment
 * row, no DriverProfile (so the driver picks their service honestly at setup).
 * Idempotent — re-running skips emails already present in the new DB.
 */
import { readFileSync } from "node:fs";
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
const FILE = arg("file", "");

if (!DRY_RUN && !APPLY) {
  console.error("Pass either --dry-run or --apply.");
  process.exit(1);
}
if (!FILE) {
  console.error("Pass --file=path/to/customers.csv");
  process.exit(1);
}
if (!process.env.DATABASE_URL_UNPOOLED) {
  console.error("Missing env: DATABASE_URL_UNPOOLED");
  process.exit(1);
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

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED } },
});
const resend = APPLY && !NO_EMAIL ? new Resend(process.env.RESEND_API_KEY) : null;

// RFC4180-ish CSV parser. Handles quoted fields, embedded commas, escaped
// double-quotes ("" → "), and CRLF / LF line endings. Good enough for
// Stripe's default customer export.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; continue; }
        inQuotes = false;
        continue;
      }
      field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function loadCsv(path) {
  const text = readFileSync(path, "utf8");
  const rows = parseCsv(text).filter((r) => r.some((c) => c && c.trim().length));
  if (rows.length < 2) throw new Error("CSV has no data rows.");
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const emailIdx = headers.indexOf("email");
  if (emailIdx === -1) throw new Error("CSV must have an `email` column.");
  const nameIdx = ["name", "customer name", "full name", "fullname"]
    .map((n) => headers.indexOf(n))
    .find((i) => i !== -1) ?? -1;

  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const email = (cols[emailIdx] ?? "").trim();
    const name = nameIdx >= 0 ? (cols[nameIdx] ?? "").trim() : "";
    if (!email) continue;
    records.push({ email, name });
  }
  return records;
}

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
  <p>After you sign in, you'll set a new password, then take 60 seconds to complete your profile. Once done you're back in the directory — and you've got two new things waiting:</p>
  <ul>
    <li><strong>Your Roadmap</strong> — a step-by-step plan to get your first bookings</li>
    <li><strong>A referral link</strong> — refer 3 drivers and your account upgrades to Premium ($97 value) for free</li>
  </ul>
  <p>I read every reply. If something isn't right, just hit reply.</p>
  <p>${esc(SIGNOFF)}<br/>FlowSync</p>
</div>`;

async function sendWelcome(email, firstName, tempPw) {
  if (!resend) return;
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: SUBJECT,
    html: renderHtml(firstName, email, tempPw),
    text: renderText(firstName, email, tempPw),
  });
  if (error) throw new Error(error.message ?? String(error));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function splitName(name) {
  if (!name) return { first: "", last: "" };
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

async function main() {
  console.log(`\nFlowSync driver import from CSV — ${APPLY ? "APPLY (live)" : "DRY RUN"}${NO_EMAIL ? " [no-email]" : ""}`);
  console.log(`Source: ${FILE}`);
  if (LIMIT) console.log(`Limit: first ${LIMIT} rows`);
  console.log("");

  const records = loadCsv(FILE);
  console.log(`Rows with email: ${records.length}`);

  let toCreate = 0;
  let created = 0;
  let skippedExisting = 0;
  let skippedAdmin = 0;
  let failed = 0;
  const previews = [];
  const start = Date.now();

  let seen = 0;
  for (const rec of records) {
    if (LIMIT && seen >= LIMIT) break;
    seen++;

    const email = rec.email.toLowerCase();
    if (ADMINS.includes(email)) { skippedAdmin++; continue; }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) { skippedExisting++; continue; }

    const { first, last } = splitName(rec.name);

    if (!APPLY) {
      toCreate++;
      if (previews.length < 5) {
        const domain = email.split("@")[1] ?? "?";
        previews.push(`${first || "(no name)"} @${domain}`);
      }
      continue;
    }

    try {
      const pw = tempPassword();
      const name = [first, last].filter(Boolean).join(" ") || null;
      // Synthetic stripeSessionId so the unique constraint is satisfied and the
      // record is identifiable as a legacy CSV import.
      const sessionId = `legacy_csv_${randomBytes(8).toString("hex")}`;
      await prisma.user.create({
        data: {
          email,
          name,
          role: "DRIVER",
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
              stripeSessionId: sessionId,
            },
          },
        },
      });

      if (!NO_EMAIL) {
        try {
          await sendWelcome(email, first, pw);
        } catch (e) {
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
  console.log(`Rows processed:    ${seen}`);
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
    console.log(`From:    ${process.env.RESEND_FROM_EMAIL ?? "(not set — required for --apply)"}`);
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
