"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { LICENSE_KINDS } from "@/lib/experience";

// Admin-only writes for verified loads and driver credentials. Every function
// calls requireAdmin() first — drivers must never be able to create or edit
// their own verified loads or approve their own credentials, or the rating a
// shipper sees would be worthless.

export interface VerifiedLoadInput {
  driverProfileId: string;
  date?: string;
  pickupCity: string;
  dropoffCity: string;
  loadType?: string;
  rating?: number | null;
  publicNote?: string;
  adminNote?: string;
  photos?: string[];
  photosPublic?: boolean;
}

function cleanRating(rating: number | null | undefined): number | null {
  if (rating === null || rating === undefined) return null;
  const r = Math.round(Number(rating));
  if (!Number.isFinite(r) || r < 1 || r > 5) return null;
  return r;
}

/** Record a completed load for a driver, optionally rating it at the same time. */
export async function addVerifiedLoad(input: VerifiedLoadInput): Promise<{ ok: boolean; error?: string }> {
  const adminId = await requireAdmin();

  const pickupCity = input.pickupCity?.trim();
  const dropoffCity = input.dropoffCity?.trim();
  if (!input.driverProfileId) return { ok: false, error: "Missing driver." };
  if (!pickupCity || !dropoffCity) return { ok: false, error: "Pickup and dropoff city are required." };

  const driver = await prisma.driverProfile.findUnique({
    where: { id: input.driverProfileId },
    select: { id: true },
  });
  if (!driver) return { ok: false, error: "Driver not found." };

  await prisma.verifiedLoad.create({
    data: {
      driverProfileId: driver.id,
      date: input.date ? new Date(input.date) : new Date(),
      pickupCity,
      dropoffCity,
      loadType: input.loadType?.trim() || null,
      rating: cleanRating(input.rating),
      publicNote: input.publicNote?.trim() || null,
      adminNote: input.adminNote?.trim() || null,
      photos: input.photos ?? [],
      photosPublic: !!input.photosPublic,
      createdById: adminId,
    },
  });

  revalidatePath(`/admin/drivers/${driver.id}`);
  revalidatePath("/admin/experience");
  revalidatePath(`/d/${driver.id}`);
  return { ok: true };
}

/** Update the rating / notes / photo visibility on a load already recorded. */
export async function updateVerifiedLoad(
  id: string,
  patch: { rating?: number | null; publicNote?: string; adminNote?: string; photosPublic?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const load = await prisma.verifiedLoad.findUnique({ where: { id }, select: { driverProfileId: true } });
  if (!load) return { ok: false, error: "Load not found." };

  await prisma.verifiedLoad.update({
    where: { id },
    data: {
      ...(patch.rating !== undefined ? { rating: cleanRating(patch.rating) } : {}),
      ...(patch.publicNote !== undefined ? { publicNote: patch.publicNote.trim() || null } : {}),
      ...(patch.adminNote !== undefined ? { adminNote: patch.adminNote.trim() || null } : {}),
      ...(patch.photosPublic !== undefined ? { photosPublic: patch.photosPublic } : {}),
    },
  });

  revalidatePath(`/admin/drivers/${load.driverProfileId}`);
  revalidatePath("/admin/experience");
  revalidatePath(`/d/${load.driverProfileId}`);
  return { ok: true };
}

export async function deleteVerifiedLoad(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const load = await prisma.verifiedLoad.findUnique({ where: { id }, select: { driverProfileId: true } });
  if (!load) return { ok: false };

  await prisma.verifiedLoad.delete({ where: { id } });

  revalidatePath(`/admin/drivers/${load.driverProfileId}`);
  revalidatePath("/admin/experience");
  revalidatePath(`/d/${load.driverProfileId}`);
  return { ok: true };
}

/**
 * Approve or reject a credential a driver uploaded. Only VERIFIED credentials
 * appear publicly, so this is the gate that stops a driver claiming a TWIC or
 * Hazmat endorsement they don't actually hold.
 */
export async function setLicenseStatus(
  id: string,
  status: "PENDING" | "VERIFIED" | "REJECTED",
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const license = await prisma.driverLicense.findUnique({ where: { id }, select: { driverProfileId: true } });
  if (!license) return { ok: false };

  await prisma.driverLicense.update({
    where: { id },
    data: { status, reviewedAt: new Date() },
  });

  revalidatePath(`/admin/drivers/${license.driverProfileId}`);
  revalidatePath("/admin/experience");
  revalidatePath(`/d/${license.driverProfileId}`);
  return { ok: true };
}

/** Admin can also record a credential on a driver's behalf (e.g. from a photo they texted in). */
export async function addLicenseForDriver(input: {
  driverProfileId: string;
  kind: string;
  customLabel?: string;
  blobUrl: string;
  expiresAt?: string;
  verified?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!LICENSE_KINDS.includes(input.kind)) return { ok: false, error: "Unknown credential type." };
  if (!input.blobUrl) return { ok: false, error: "A photo of the credential is required." };

  await prisma.driverLicense.create({
    data: {
      driverProfileId: input.driverProfileId,
      kind: input.kind as never,
      customLabel: input.kind === "OTHER" ? input.customLabel?.trim() || null : null,
      blobUrl: input.blobUrl,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      status: input.verified ? "VERIFIED" : "PENDING",
      reviewedAt: input.verified ? new Date() : null,
    },
  });

  revalidatePath(`/admin/drivers/${input.driverProfileId}`);
  revalidatePath("/admin/experience");
  revalidatePath(`/d/${input.driverProfileId}`);
  return { ok: true };
}

export async function deleteLicense(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const license = await prisma.driverLicense.findUnique({ where: { id }, select: { driverProfileId: true } });
  if (!license) return { ok: false };

  await prisma.driverLicense.delete({ where: { id } });

  revalidatePath(`/admin/drivers/${license.driverProfileId}`);
  revalidatePath("/admin/experience");
  revalidatePath(`/d/${license.driverProfileId}`);
  return { ok: true };
}
