"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function approveDriver(driverProfileId: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.driverProfile.update({
    where: { id: driverProfileId },
    data: {
      verified: true,
      documents: { updateMany: { where: {}, data: { status: "VERIFIED" } } },
    },
  });
  revalidatePath("/admin");
  revalidatePath("/find-a-driver");
  return { ok: true };
}

export async function rejectDriver(driverProfileId: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.driverProfile.update({
    where: { id: driverProfileId },
    data: {
      verified: false,
      documents: { updateMany: { where: {}, data: { status: "REJECTED" } } },
    },
  });
  revalidatePath("/admin");
  revalidatePath("/find-a-driver");
  return { ok: true };
}
