"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { putDocument } from "@/lib/storage";
import { LICENSE_KINDS } from "@/lib/experience";

// Driver-scoped writes for their own credentials and public photo choices.
// Every function resolves the profile from the SESSION and scopes the query to
// it — a driver can never touch another driver's records by passing an id.
// Approving a credential remains admin-only (actions/experience.ts): a driver
// uploading proof must never be able to mark it verified themselves.

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

function revalidate(profileId: string) {
  revalidatePath("/account/experience");
  revalidatePath("/profile");
  revalidatePath(`/d/${profileId}`);
}

/** Upload a credential (TWIC, Hazmat, CDL...). Always starts as PENDING review. */
export async function addMyCredential(input: {
  kind: string;
  customLabel?: string;
  dataUrl: string;
  expiresAt?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const driverProfileId = await requireProfileId();

  if (!LICENSE_KINDS.includes(input.kind)) return { ok: false, error: "Pick a credential type." };
  if (!input.dataUrl) return { ok: false, error: "Add a photo of the credential." };
  if (input.kind === "OTHER" && !input.customLabel?.trim()) {
    return { ok: false, error: "Name the credential." };
  }

  const blobUrl = await putDocument(
    input.dataUrl,
    `credentials/${driverProfileId}/${input.kind}-${Date.now()}`,
  );

  await prisma.driverLicense.create({
    data: {
      driverProfileId,
      kind: input.kind as never,
      customLabel: input.kind === "OTHER" ? input.customLabel!.trim() : null,
      blobUrl,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      // Never self-approve — an admin has to verify it before it shows publicly.
      status: "PENDING",
    },
  });

  revalidate(driverProfileId);
  return { ok: true };
}

export async function deleteMyCredential(id: string): Promise<{ ok: boolean }> {
  const driverProfileId = await requireProfileId();
  // Scoped delete: silently no-ops if the row belongs to someone else.
  await prisma.driverLicense.deleteMany({ where: { id, driverProfileId } });
  revalidate(driverProfileId);
  return { ok: true };
}

/**
 * Choose whether one delivery photo appears in the public gallery.
 * Delivery photos routinely show house numbers, packages, and plates, so this
 * is opt-in per photo and defaults to off.
 */
export async function setTripPhotoPublic(
  tripId: string,
  photoUrl: string,
  makePublic: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const driverProfileId = await requireProfileId();

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverProfileId },
    select: { id: true, photos: true, publicPhotos: true },
  });
  if (!trip) return { ok: false, error: "Trip not found." };
  // Only a photo actually attached to this trip can be published.
  if (!trip.photos.includes(photoUrl)) return { ok: false, error: "Unknown photo." };

  const next = makePublic
    ? Array.from(new Set([...trip.publicPhotos, photoUrl]))
    : trip.publicPhotos.filter((p) => p !== photoUrl);

  await prisma.trip.update({ where: { id: trip.id }, data: { publicPhotos: next } });

  revalidate(driverProfileId);
  return { ok: true };
}
