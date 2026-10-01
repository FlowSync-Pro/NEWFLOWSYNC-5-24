/**
 * Find drivers who PAID for Premium (or the fleet, which includes Premium) but
 * aren't on the Premium tier — READ-ONLY. Reads Stripe and the database, writes
 * one CSV to ./backups/. Creates, changes and deletes nothing anywhere.
 *
 * Why this exists: until the fix that ships with this script, a Premium upgrade
 * paid on offer page A (or the fleet on offer page B) before the driver had
 * finished /account/setup was recorded as a payment but never applied — no
 * Premium tier, no Premium email. That was the normal path, so check everyone.
 *
 * Usage (same env the app uses — needs STRIPE_SECRET_KEY and DATABASE_URL):
 *   node --env-file=.env.local scripts/find-unapplied-premium.mjs
 *   node --env-file=.env.local scripts/find-unapplied-premium.mjs --since 2026-09-01
 *
 * Default --since is 2026-09-29, when the post-checkout offers launched.
 *
 * Output:
 *   ./backups/unapplied-premium-YYYY-MM-DDTHH-MM-SSZ.csv   (gitignored — PII)
 *   plus a summary on the console saying what to do for each driver.
 */
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SINCE = "2026-09-29";

/**
 * Pure: given paid Premium/fleet sessions and the matching users, return one row
 * per driver whose profile isn't PREMIUM (or who has no profile at all).
 * `users` is keyed by user id and by lowercased email.
 */
export function findUnapplied(sessions, usersById, usersByEmail) {
  const rows = new Map();
  for (const s of sessions) {
    const md = s.metadata ?? {};
    const email = (s.customer_details?.email ?? md.email ?? "").toLowerCase();
    const user = (md.userId && usersById.get(md.userId)) || (email && usersByEmail.get(email)) || null;
    if (!user) continue; // account never created or deleted — nothing to upgrade
    if (user.driverProfile?.tier === "PREMIUM") continue; // already applied
    const prev = rows.get(user.id);
    const bought = md.type === "fleet" ? "Curri fleet" : "Premium";
    const paid = (s.amount_total ?? 0) / 100;
    if (prev) {
      prev.bought = prev.bought.includes(bought) ? prev.bought : `${prev.bought} + ${bought}`;
      prev.paid += paid;
      continue;
    }
    rows.set(user.id, {
      email: user.email,
      name: user.driverProfile ? `${user.driverProfile.firstName} ${user.driverProfile.lastName}`.trim() : user.name ?? "",
      bought,
      paid,
      paidAt: new Date(s.created * 1000).toISOString(),
      problem: user.driverProfile ? "profile is on Verified" : "no profile yet",
      fleetMember: !!user.fleetJoinedAt,
    });
  }
  return [...rows.values()].sort((a, b) => a.paidAt.localeCompare(b.paidAt));
}

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

  const sinceArg = process.argv.indexOf("--since");
  const since = new Date(sinceArg > -1 ? process.argv[sinceArg + 1] : DEFAULT_SINCE);
  if (Number.isNaN(since.getTime())) throw new Error("--since must be a date like 2026-09-29.");

  const stripe = new Stripe(key);
  console.log(`Reading paid Premium and fleet checkouts from Stripe since ${since.toISOString().slice(0, 10)} …`);
  const sessions = [];
  for await (const s of stripe.checkout.sessions.list({ created: { gte: Math.floor(since.getTime() / 1000) }, limit: 100 })) {
    const type = s.metadata?.type;
    if (s.payment_status === "paid" && (type === "upgrade" || type === "fleet")) sessions.push(s);
  }
  console.log(`  ${sessions.length} paid Premium/fleet checkouts`);

  const prisma = new PrismaClient();
  try {
    const ids = [...new Set(sessions.map((s) => s.metadata?.userId).filter(Boolean))];
    const emails = [...new Set(sessions.map((s) => (s.customer_details?.email ?? s.metadata?.email ?? "").toLowerCase()).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { OR: [{ id: { in: ids } }, { email: { in: emails } }] },
      select: { id: true, email: true, name: true, fleetJoinedAt: true, driverProfile: { select: { firstName: true, lastName: true, tier: true } } },
    });
    const usersById = new Map(users.map((u) => [u.id, u]));
    const usersByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
    const rows = findUnapplied(sessions, usersById, usersByEmail);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace(/-(\d{3})Z$/, "Z");
    mkdirSync("backups", { recursive: true });
    const outPath = join("backups", `unapplied-premium-${stamp}.csv`);
    const header = ["email", "name", "bought", "paid_usd", "paid_at", "problem", "fleet_member"];
    writeFileSync(outPath, [header.join(","), ...rows.map((r) => [r.email, r.name, r.bought, r.paid.toFixed(2), r.paidAt, r.problem, r.fleetMember].map(csvCell).join(","))].join("\n") + "\n");

    console.log("");
    if (rows.length === 0) {
      console.log("✓ Every driver who paid for Premium or the fleet is on Premium. Nothing to fix.");
    } else {
      console.table(rows.map(({ email, name, bought, paid, problem }) => ({ email, name, bought, paid: `$${paid.toFixed(0)}`, problem })));
      console.log(`${rows.length} driver(s) paid but aren't on Premium. Full detail in ${outPath}`);
      console.log("\nWhat to do:");
      console.log("  • \"profile is on Verified\" → open /admin, find the driver, click \"★ Upgrade to Premium\".");
      console.log("    That also sends them the Premium welcome email.");
      console.log("  • \"no profile yet\" → they haven't finished setup. Ask them to sign in and finish it,");
      console.log("    then click \"★ Upgrade to Premium\" for them in /admin.");
    }
    console.log("\nThis script changed nothing. The CSV contains personal data — keep it out of git.");
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error("FAILED (nothing was changed):", e.message ?? e);
    process.exit(1);
  });
}
