"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isPremiumTier } from "@/lib/pricing";

async function requirePremiumProfileId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, tier: true },
  });
  if (!profile) throw new Error("No driver profile.");
  if (!isPremiumTier(profile.tier)) throw new Error("My Services is a Premium feature.");
  return profile.id;
}

export interface ServiceInput {
  name: string;
  description?: string;
  price: number; // dollars
}

export async function addService(input: ServiceInput): Promise<{ ok: boolean; error?: string }> {
  const driverProfileId = await requirePremiumProfileId();
  const name = input.name.trim();
  const price = Number(input.price);
  if (!name) return { ok: false, error: "Name is required." };
  if (!price || price <= 0) return { ok: false, error: "Enter a price greater than 0." };

  const count = await prisma.driverService.count({ where: { driverProfileId } });
  await prisma.driverService.create({
    data: {
      driverProfileId,
      name,
      description: input.description?.trim() || null,
      priceCents: Math.round(price * 100),
      sortOrder: count,
    },
  });
  revalidatePath("/account/services");
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteService(id: string): Promise<{ ok: boolean }> {
  const driverProfileId = await requirePremiumProfileId();
  await prisma.driverService.deleteMany({ where: { id, driverProfileId } });
  revalidatePath("/account/services");
  revalidatePath("/profile");
  return { ok: true };
}
