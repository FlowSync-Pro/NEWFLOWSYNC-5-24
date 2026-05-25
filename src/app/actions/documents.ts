"use server";

import { revalidatePath } from "next/cache";
import { DocKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { putDocument } from "@/lib/storage";
import { DOC_KIND } from "@/lib/enums";
import type { DocKey } from "@/lib/profile";

async function requireProfileId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!profile) throw new Error("No driver profile.");
  return profile.id;
}

/** Save (or replace) a document. `dataUrl` is the client-downscaled image. */
export async function saveDocument(key: DocKey, dataUrl: string): Promise<{ ok: boolean }> {
  const driverProfileId = await requireProfileId();
  const kind = DOC_KIND[key];
  const blobUrl = await putDocument(dataUrl, `documents/${driverProfileId}/${key}`);

  await prisma.document.upsert({
    where: { driverProfileId_kind: { driverProfileId, kind } },
    create: { driverProfileId, kind, blobUrl },
    update: { blobUrl, status: "PENDING" },
  });

  // Verified once license + insurance are present.
  const docs = await prisma.document.findMany({ where: { driverProfileId }, select: { kind: true } });
  const kinds = new Set(docs.map((d) => d.kind));
  const verified = kinds.has(DocKind.LICENSE) && kinds.has(DocKind.INSURANCE);
  await prisma.driverProfile.update({ where: { id: driverProfileId }, data: { verified } });

  revalidatePath("/account");
  revalidatePath("/profile");
  return { ok: true };
}

export async function removeDocument(key: DocKey): Promise<{ ok: boolean }> {
  const driverProfileId = await requireProfileId();
  const kind = DOC_KIND[key];
  await prisma.document.deleteMany({ where: { driverProfileId, kind } });

  if (kind === DocKind.LICENSE || kind === DocKind.INSURANCE) {
    await prisma.driverProfile.update({ where: { id: driverProfileId }, data: { verified: false } });
  }
  revalidatePath("/account");
  revalidatePath("/profile");
  return { ok: true };
}
