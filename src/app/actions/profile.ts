"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { serviceToEnum } from "@/lib/enums";
import type { ServiceId } from "@/lib/services";

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
  if (!firstName || !lastName) return { error: "Enter your first and last name." };

  // "undecided" (or anything not in our list) means the driver wants to pick
  // their main service later. Stored as null; they get a nudge on /account.
  const primaryService = SERVICE_IDS.includes(rawService as ServiceId)
    ? serviceToEnum(rawService as ServiceId)
    : null;

  const existing = await prisma.driverProfile.findUnique({ where: { userId: session.userId } });
  const data = { firstName, lastName, primaryService };
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
  /** A driver who skipped this at setup can pick (or change) it later. */
  primaryService?: ServiceId | null;
  additionalServices?: ServiceId[];
  serviceDetails?: Record<string, string | string[]>;
  externalWebsiteUrl?: string;
}

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
export async function saveDriverProfile(input: ProfileInput): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");

  const data: Prisma.DriverProfileUpdateInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    city: input.city,
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

  await prisma.driverProfile.update({ where: { userId: session.userId }, data });
  revalidatePath("/account");
  revalidatePath("/profile");
  return { ok: true };
}
