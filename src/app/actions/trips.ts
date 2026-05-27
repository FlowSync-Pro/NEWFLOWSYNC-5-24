"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { putDocument } from "@/lib/storage";

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

export interface TripInput {
  date?: string;
  pickupAddress: string;
  dropoffAddress: string;
  earnings: number; // dollars
  paidMiles: number;
  deadheadMiles: number;
  fuel: number; // dollars
  tolls: number; // dollars
  otherExpenses: number; // dollars
  durationMinutes: number;
  notes?: string;
  photos?: string[]; // client-downscaled data URLs
}

const dollarsToCents = (n: number) => Math.round((Number(n) || 0) * 100);

export async function addTrip(input: TripInput): Promise<{ ok: boolean; error?: string }> {
  const driverProfileId = await requireProfileId();
  if (!input.pickupAddress?.trim() || !input.dropoffAddress?.trim()) {
    return { ok: false, error: "Enter a pickup and drop-off address." };
  }

  // Persist any uploaded photos (Blob if configured, else inline).
  const photos: string[] = [];
  for (const [i, dataUrl] of (input.photos ?? []).slice(0, 6).entries()) {
    photos.push(await putDocument(dataUrl, `trips/${driverProfileId}/${Date.now()}-${i}`));
  }

  await prisma.trip.create({
    data: {
      driverProfileId,
      date: input.date ? new Date(input.date) : new Date(),
      pickupAddress: input.pickupAddress.trim(),
      dropoffAddress: input.dropoffAddress.trim(),
      earningsCents: dollarsToCents(input.earnings),
      paidMiles: Number(input.paidMiles) || 0,
      deadheadMiles: Number(input.deadheadMiles) || 0,
      fuelCents: dollarsToCents(input.fuel),
      tollsCents: dollarsToCents(input.tolls),
      otherExpensesCents: dollarsToCents(input.otherExpenses),
      durationMinutes: Math.round(Number(input.durationMinutes) || 0),
      notes: input.notes?.trim() || null,
      photos,
    },
  });
  revalidatePath("/account/trips");
  return { ok: true };
}

export async function deleteTrip(id: string): Promise<{ ok: boolean }> {
  const driverProfileId = await requireProfileId();
  await prisma.trip.deleteMany({ where: { id, driverProfileId } });
  revalidatePath("/account/trips");
  return { ok: true };
}

export interface InspectionInput {
  odometer?: number;
  items: Record<string, boolean>;
  notes?: string;
}

export async function addInspection(input: InspectionInput): Promise<{ ok: boolean }> {
  const driverProfileId = await requireProfileId();
  const passed = Object.values(input.items ?? {}).every(Boolean);
  await prisma.inspection.create({
    data: {
      driverProfileId,
      odometer: input.odometer ? Math.round(input.odometer) : null,
      passed,
      items: input.items ?? {},
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath("/account/trips");
  return { ok: true };
}
