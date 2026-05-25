/**
 * Export Stripe customers to a Resend-ready CSV (read-only — creates nothing,
 * sends nothing). Used to build the audience for the relaunch broadcast.
 *
 * Run with your LIVE Stripe key:
 *   node --env-file=.env.local scripts/export-stripe-customers.mjs
 * Produces ./stripe-customers.csv with columns: email,first_name,last_name
 * Then import that file into a Resend Audience.
 */
import Stripe from "stripe";
import { writeFileSync } from "node:fs";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set. Add it to .env.local (use your LIVE key to export real customers).");
  process.exit(1);
}
const stripe = new Stripe(key);

function csvCell(v) {
  const s = (v ?? "").toString();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const seen = new Set();
  const rows = [];
  let withEmail = 0;

  for await (const c of stripe.customers.list({ limit: 100 })) {
    const email = (c.email || "").trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    withEmail++;
    const [firstName = "", ...rest] = (c.name || "").split(" ");
    rows.push([email, firstName, rest.join(" ")]);
  }

  const csv = ["email,first_name,last_name", ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
  writeFileSync("stripe-customers.csv", csv + "\n");
  console.log(`Exported ${withEmail} unique customer emails to stripe-customers.csv`);
  console.log("Next: import this file into a Resend Audience, then create a Broadcast.");
}

main().catch((e) => { console.error(e); process.exit(1); });
