"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { serviceToEnum } from "@/lib/enums";
import type { ServiceId } from "@/lib/services";

export async function getMyDriverProfile() {
  const session = await getSession();
  if (!session) return null;
  return prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: { documents: true },
  });
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
  additionalServices?: ServiceId[];
  serviceDetails?: Record<string, string | string[]>;
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
    additionalServices: input.additionalServices?.map(serviceToEnum),
    serviceDetails: input.serviceDetails as Prisma.InputJsonValue | undefined,
  };

  await prisma.driverProfile.update({ where: { userId: session.userId }, data });
  revalidatePath("/account");
  revalidatePath("/profile");
  return { ok: true };
}
