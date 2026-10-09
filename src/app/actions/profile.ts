"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { serviceToEnum } from "@/lib/enums";
import { normalizeZip } from "@/lib/geo";
import type { ServiceId } from "@/lib/services";
import { VEHICLE_TYPES, isValidVin, normalizeVin, pruneAccessories } from "@/lib/vehicles";

const SERVICE_IDS: ServiceId[] = [
  "grocery", "food", "furniture", "courier", "pharmacy", "senior", "moving", "auto-parts",
];

export async function getMyDriverProfile() {
  const session = await getSession();
  if (!session) return null;
  return prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: { documents: true },
  });
}

export interface SetupState {
  error?: string;
}

/** First-run profile creation for accounts that don't have a profile yet
 * (e.g. migrated Stripe customers, or paid checkouts without profile metadata). */
export async function completeDriverProfile(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const session = await getSession();
  if (!session) redirect("/signin");

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const rawService = String(formData.get("primaryService") ?? "");
  // Optional: puts the driver on their city's /delivery page. Blank leaves
  // an existing value alone on a revisit.
  const city = String(formData.get("city") ?? "").trim().replace(/\s+/g, " ").slice(0, 80) || undefined;
  if (!firstName || !lastName) return { error: "Enter your first and last name." };

  // "undecided" (or anything not in our list) means the driver wants to pick
  // their main service later. Stored as null; they get a nudge on /account.
  const primaryService = SERVICE_IDS.includes(rawService as ServiceId)
    ? serviceToEnum(rawService as ServiceId)
    : null;

  const existing = await prisma.driverProfile.findUnique({ where: { userId: session.userId } });
  const data = { firstName, lastName, primaryService, city };
  if (existing) {
    // Profile already exists (e.g. revisiting setup) — apply the resubmitted
    // values instead of silently discarding them.
    await prisma.driverProfile.update({ where: { userId: session.userId }, data });
  } else {
    await prisma.driverProfile.create({ data: { userId: session.userId, ...data } });
  }
  redirect("/account");
}

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  headline?: string;
  bio?: string;
  hourlyRate?: number | null;
  yearsExperience?: number | null;
  serviceRadius?: string;
  availability?: string[];
  languages?: string[];
  vehicleType?: string;
  vehicleMakeModel?: string;
  vehicleYear?: string;
  /** Accessories on the main vehicle; anything not on that vehicle type's list is dropped. */
  vehicleAccessories?: string[];
  /** The driver's extra vehicles, as the whole list: rows left out are removed. Untouched when undefined. */
  vehicles?: VehicleInput[];
  /** 5-digit ZIP the driver starts from; "" clears it. Used only for fleet dispatch distance. */
  baseZip?: string;
  /** A driver who skipped this at setup can pick (or change) it later. */
  primaryService?: ServiceId | null;
  additionalServices?: ServiceId[];
  serviceDetails?: Record<string, string | string[]>;
  externalWebsiteUrl?: string;
}

export interface VehicleInput {
  /** Existing row id, or "" / undefined for a new vehicle. */
  id?: string;
  type: string;
  makeModel?: string;
  year?: string;
  /** Required for every extra vehicle (owner decision 2026-10-09); never shown publicly. */
  vin?: string;
  accessories?: string[];
}

const isVehicleType = (t: string): boolean => (VEHICLE_TYPES as readonly string[]).includes(t);

/** Accept only http(s) URLs; reject javascript:/data: and other schemes that
 * would become an XSS vector when rendered as an <a href> on the public profile. */
function safeWebsiteUrl(raw?: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Update the signed-in driver's profile. The profile row is created at registration. */
export async function saveDriverProfile(input: ProfileInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");

  const current = await prisma.driverProfile.findUnique({ where: { userId: session.userId }, select: { id: true, vehicleType: true } });
  if (!current) throw new Error("No profile.");

  // Accessories only ever match the vehicle they're on: prune against the type
  // being saved (or the one on file), so a switch to Sedan clears them.
  const mainType = input.vehicleType ?? current.vehicleType ?? "";
  const vehicleAccessories = input.vehicleAccessories === undefined ? undefined : pruneAccessories(mainType, input.vehicleAccessories);

  // Extra vehicles: validate before anything is written.
  let vehicles: { id: string | null; type: string; makeModel: string | null; year: string | null; vin: string; accessories: string[] }[] | undefined;
  if (input.vehicles !== undefined) {
    vehicles = [];
    for (const [i, v] of input.vehicles.slice(0, 10).entries()) {
      const type = (v.type ?? "").trim();
      if (!isVehicleType(type)) return { ok: false, error: `Pick a vehicle type for vehicle ${i + 2}.` };
      const vin = normalizeVin(v.vin);
      if (!isValidVin(vin)) return { ok: false, error: `Enter the 17-character VIN for vehicle ${i + 2} (letters and numbers, no I, O or Q).` };
      vehicles.push({
        id: v.id?.trim() || null,
        type,
        makeModel: v.makeModel?.trim().slice(0, 80) || null,
        year: v.year?.trim().slice(0, 10) || null,
        vin,
        accessories: pruneAccessories(type, v.accessories ?? []),
      });
    }
  }

  const data: Prisma.DriverProfileUpdateInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    city: input.city?.trim().replace(/\s+/g, " ").slice(0, 80),
    headline: input.headline,
    bio: input.bio,
    hourlyRate: input.hourlyRate ?? undefined,
    yearsExperience: input.yearsExperience ?? undefined,
    serviceRadius: input.serviceRadius,
    availability: input.availability,
    languages: input.languages,
    vehicleType: input.vehicleType,
    vehicleMakeModel: input.vehicleMakeModel,
    vehicleYear: input.vehicleYear,
    vehicleAccessories,
    // Only touched when provided: a valid ZIP sets it, "" clears it, anything else is ignored.
    baseZip: input.baseZip === undefined ? undefined : input.baseZip.trim() === "" ? null : (normalizeZip(input.baseZip) ?? undefined),
    // primaryService is only touched if explicitly provided: undefined leaves
    // it alone; an explicit ServiceId sets it; null clears it back to undecided.
    primaryService:
      input.primaryService === undefined
        ? undefined
        : input.primaryService === null
          ? null
          : serviceToEnum(input.primaryService),
    additionalServices: input.additionalServices?.map(serviceToEnum),
    serviceDetails: input.serviceDetails as Prisma.InputJsonValue | undefined,
    externalWebsiteUrl: safeWebsiteUrl(input.externalWebsiteUrl),
  };

  await prisma.$transaction(async (tx) => {
    await tx.driverProfile.update({ where: { userId: session.userId }, data });
    if (!vehicles) return;
    // The list is the whole truth: a row the driver removed in the editor is
    // deleted (their own vehicle, their own action), kept rows are updated in
    // place, new ones created. Ids are scoped to this profile, so a forged id
    // can't touch another driver's vehicle.
    const keep = vehicles.map((v) => v.id).filter((id): id is string => !!id);
    await tx.driverVehicle.deleteMany({ where: { profileId: current.id, id: { notIn: keep } } });
    for (const [sortOrder, v] of vehicles.entries()) {
      const row = { type: v.type, makeModel: v.makeModel, year: v.year, vin: v.vin, accessories: v.accessories, sortOrder: sortOrder + 1 };
      if (v.id) {
        const n = await tx.driverVehicle.updateMany({ where: { id: v.id, profileId: current.id }, data: row });
        if (n.count === 1) continue;
      }
      await tx.driverVehicle.create({ data: { ...row, profileId: current.id } });
    }
  });
  revalidatePath("/account");
  revalidatePath("/profile");
  return { ok: true };
}
