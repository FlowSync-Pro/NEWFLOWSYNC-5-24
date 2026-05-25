"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { sendDriverApprovedEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

export async function approveDriver(driverProfileId: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const driver = await prisma.driverProfile.update({
    where: { id: driverProfileId },
    data: {
      verified: true,
      documents: { updateMany: { where: {}, data: { status: "VERIFIED" } } },
    },
    include: { user: true },
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  await sendDriverApprovedEmail({
    to: driver.user.email,
    firstName: driver.firstName,
    profileUrl: `${base}/profile`,
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
