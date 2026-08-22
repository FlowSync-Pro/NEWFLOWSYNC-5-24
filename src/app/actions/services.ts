"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

// My Services (custom service menu) is available to ALL drivers — no tier gate.
// Premium keeps the badge, gold styling, featured directory placement, and the
// external website link; the service-menu tool itself is open to everyone.
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

export interface ServiceInput {
  name: string;
  description?: string;
  price: number; // dollars
}

export async function addService(input: ServiceInput): Promise<{ ok: boolean; error?: string }> {
  const driverProfileId = await requireProfileId();
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
  const driverProfileId = await requireProfileId();
  await prisma.driverService.deleteMany({ where: { id, driverProfileId } });
  revalidatePath("/account/services");
  revalidatePath("/profile");
  return { ok: true };
}
