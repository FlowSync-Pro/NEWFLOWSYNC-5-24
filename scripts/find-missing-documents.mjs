/**
 * Find drivers whose uploaded documents are gone from the database — READ-ONLY.
 * Reads Vercel Blob and the database, writes one CSV to ./backups/. Creates,
 * changes and deletes nothing in the database or in Blob storage.
 *
 * Why this exists: until 2026-09-30 the document card in /account/edit treated
 * a file the browser couldn't read as a photo (a PDF, HEIC on most browsers) as
 * "remove this document". The Document row was deleted with no message to the
 * driver. The uploaded FILE was never deleted from Vercel Blob, though — every
 * upload lives at documents/<driverProfileId>/<key>-<random>.<ext>. So a driver
 * who has a file in Blob for a document kind but no Document row for that kind
 * lost that document. (A driver who clicked "Remove" on purpose looks the same;
 * the list errs on the side of reaching out.)
 *
 * Drivers whose files were stored inline (before BLOB_READ_WRITE_TOKEN was set)
 * leave no trace here. For those, compare the Document table against a Neon
 * backup branch or point-in-time restore instead.
 *
 * Usage (same env the app uses — needs DATABASE_URL and BLOB_READ_WRITE_TOKEN):
 *   node --env-file=.env.local scripts/find-missing-documents.mjs
 *
 * Output:
 *   ./backups/missing-documents-YYYY-MM-DDTHH-MM-SSZ.csv   (gitignored — PII)
 *   plus a summary and a ready-to-paste BCC line on the console.
 */
import { PrismaClient } from "@prisma/client";
import { list } from "@vercel/blob";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Same mapping as src/lib/enums.ts DOC_KIND / src/lib/profile.ts DOCUMENTS.
const DOC_KINDS = {
  profilePhoto: { kind: "PROFILE_PHOTO", label: "Profile photo" },
  vehiclePhoto: { kind: "VEHICLE_PHOTO", label: "Vehicle photo" },
  license: { kind: "LICENSE", label: "Driver's license" },
  insurance: { kind: "INSURANCE", label: "Valid insurance" },
  drivingRecord: { kind: "DRIVING_RECORD", label: "Driving record" },
};

/** documents/<profileId>/<key>-<random>.<ext>  →  { profileId, key } or null. */
export function parseBlobPath(pathname) {
  const m = /^documents\/([^/]+)\/([A-Za-z]+)(?:-[^/.]+)?\.[A-Za-z0-9]+$/.exec(pathname);
  if (!m || !DOC_KINDS[m[2]]) return null;
  return { profileId: m[1], key: m[2] };
}

/**
 * Pure: given every blob, every Document row and every profile, return one row
 * per (driver, document kind) that has files in Blob but no Document row.
 */
export function findMissing(blobs, documents, profiles) {
  const hasRow = new Set(documents.map((d) => `${d.driverProfileId}:${d.kind}`));
  const byProfile = new Map(profiles.map((p) => [p.id, p]));
  const groups = new Map();
  for (const b of blobs) {
    const parsed = parseBlobPath(b.pathname);
    if (!parsed) continue;
    const { profileId, key } = parsed;
    const kind = DOC_KINDS[key].kind;
    if (hasRow.has(`${profileId}:${kind}`)) continue; // still on file — fine
    const profile = byProfile.get(profileId);
    if (!profile) continue; // account no longer exists
    const id = `${profileId}:${key}`;
    const g = groups.get(id) ?? { profile, key, files: [] };
    g.files.push(b);
    groups.set(id, g);
  }
  return [...groups.values()]
    .map(({ profile, key, files }) => {
      files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      return {
        email: profile.user.email,
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        document: DOC_KINDS[key].label,
        lastUploaded: new Date(files[0].uploadedAt).toISOString(),
        filesInStorage: files.length,
        latestFileUrl: files[0].url,
        verified: profile.verified,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email) || a.document.localeCompare(b.document));
}

async function listAllDocumentBlobs(token) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ token, prefix: "documents/", limit: 1000, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not set — nothing to compare against.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

  const prisma = new PrismaClient();
  try {
    console.log("Reading Vercel Blob (documents/) …");
    const blobs = await listAllDocumentBlobs(token);
    console.log(`  ${blobs.length} files in storage`);

    console.log("Reading database …");
    const [documents, profiles] = await Promise.all([
      prisma.document.findMany({ select: { driverProfileId: true, kind: true } }),
      prisma.driverProfile.findMany({
        select: { id: true, firstName: true, lastName: true, verified: true, user: { select: { email: true } } },
      }),
    ]);
    console.log(`  ${documents.length} document rows, ${profiles.length} driver profiles`);

    const rows = findMissing(blobs, documents, profiles);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace(/-(\d{3})Z$/, "Z");
    mkdirSync("backups", { recursive: true });
    const outPath = join("backups", `missing-documents-${stamp}.csv`);
    const header = ["email", "name", "document", "last_uploaded", "files_in_storage", "latest_file_url", "currently_verified"];
    const csv = [header.join(","), ...rows.map((r) => [r.email, r.name, r.document, r.lastUploaded, r.filesInStorage, r.latestFileUrl, r.verified].map(csvCell).join(","))].join("\n");
    writeFileSync(outPath, csv + "\n");

    console.log("");
    if (rows.length === 0) {
      console.log("✓ No driver has a file in storage without a matching document row. Nothing to reach out about.");
    } else {
      console.table(rows.map(({ email, name, document, lastUploaded }) => ({ email, name, document, lastUploaded: lastUploaded.slice(0, 10) })));
      const emails = [...new Set(rows.map((r) => r.email))];
      console.log(`${emails.length} driver(s), ${rows.length} missing document(s). Full detail (with file links) in ${outPath}`);
      console.log("\nBCC line, ready to paste:\n" + emails.join(", "));
    }
    console.log("\nReminder: someone who clicked Remove on purpose appears here too. The CSV is PII — keep it out of git.");
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
