/**
 * Driver-data backup — READ-ONLY. Exports every driver-critical table to a
 * single timestamped JSON file. Creates nothing in the database, deletes
 * nothing, changes nothing. Safe to run against production any time.
 *
 * Why this exists: driver data has been wiped twice by structural changes made
 * without a backup first (see AGENTS.md → "DATA SAFETY"). This is the JSON half
 * of the required backup (the other half is a `pg_dump` SQL dump — see the
 * companion note printed at the end of this script). Run BOTH before any schema
 * change, migration, or "major upgrade".
 *
 * Usage (uses the same DATABASE_URL the app uses):
 *   node --env-file=.env.local scripts/backup-driver-data.mjs
 *
 * Output:
 *   ./backups/driver-data-YYYY-MM-DDTHH-MM-SSZ.json   (gitignored — contains PII)
 *
 * The output is git-ignored on purpose (customer PII). After it's written, copy
 * it OUTSIDE the app — cloud storage (S3 / Google Drive / Vercel Blob) or keep a
 * DB-provider snapshot. Never commit it.
 *
 * Restore sketch (manual, only in a real emergency, with approval): each top-level
 * key is a table; rows are plain objects. Re-insert with prisma.<model>.createMany
 * or `INSERT ... ON CONFLICT DO NOTHING` so existing rows are never clobbered.
 */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

// Every driver-critical model, in dependency order (parents before children) so
// a future restore can insert without violating foreign keys. Auth.js adapter
// tables (Account/Session/VerificationToken) and Telegram support records are
// included for completeness — a backup should be total.
const MODELS = [
  "user",
  "driverProfile",
  "trip",
  "inspection",
  "driverService",
  "document",
  "booking",
  "payment",
  "review",
  "account",
  "session",
  "verificationToken",
  "telegramKnowledgeEntry",
  "telegramEscalation",
  "telegramProcessedUpdate",
  "telegramBotSetting",
];

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace(/-(\d{3})Z$/, "Z");
  const dir = "backups";
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, `driver-data-${stamp}.json`);

  const dump = {
    _meta: {
      exportedAt: new Date().toISOString(),
      note: "FlowSync driver-data backup. Contains PII. Do not commit. Store outside the app.",
      counts: {},
    },
  };

  let total = 0;
  for (const model of MODELS) {
    if (!prisma[model] || typeof prisma[model].findMany !== "function") {
      console.warn(`! skipping unknown model: ${model}`);
      continue;
    }
    const rows = await prisma[model].findMany();
    dump[model] = rows;
    dump._meta.counts[model] = rows.length;
    total += rows.length;
    console.log(`  ${model.padEnd(20)} ${rows.length} rows`);
  }

  // BigInt-safe + Date-friendly serialization.
  const json = JSON.stringify(
    dump,
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
  writeFileSync(outPath, json + "\n");

  console.log(`\n✓ Wrote ${total} rows across ${MODELS.length} tables to ${outPath}`);
  console.log("\nNext steps (manual):");
  console.log("  1. Move this file OUTSIDE the app (cloud storage). Never commit it.");
  console.log("  2. For a full safety net, also take a SQL dump:");
  console.log('     pg_dump "$DATABASE_URL_UNPOOLED" > backups/driver-data-' + stamp + ".sql");
  console.log("  3. Confirm Neon point-in-time recovery is enabled (Neon dashboard → Backups).");
}

main()
  .catch((e) => {
    console.error("Backup FAILED — do not proceed with any schema change:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
