"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { sendDriverApprovedEmail, sendPremiumUpgradeEmail, sendTempPasswordEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

/** Admin-issues a temporary password for a driver who's locked out.
 * Returns the temp password so the admin can relay it directly (e.g. if email
 * isn't reaching the driver). The driver must set a new one on next sign-in. */
export async function adminResetDriverPassword(driverProfileId: string): Promise<{ ok: boolean; tempPassword?: string; error?: string }> {
  await requireAdmin();
  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: { user: true },
  });
  if (!driver) return { ok: false, error: "Driver not found." };

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: driver.user.id },
    data: { hashedPassword: hashPassword(tempPassword), mustResetPassword: true },
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  await sendTempPasswordEmail({
    to: driver.user.email,
    firstName: driver.firstName,
    tempPassword,
    signInUrl: `${base}/signin`,
  });

  return { ok: true, tempPassword };
}

export async function setDriverTier(driverProfileId: string, tier: "STANDARD" | "PREMIUM"): Promise<{ ok: boolean }> {
  await requireAdmin();
  const driver = await prisma.driverProfile.update({
    where: { id: driverProfileId },
    data: { tier },
    include: { user: true },
  });

  if (tier === "PREMIUM") {
    const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
    await sendPremiumUpgradeEmail({
      to: driver.user.email,
      firstName: driver.firstName,
      servicesUrl: `${base}/account/services`,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/find-a-driver");
  return { ok: true };
}

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

/** Permanently delete a driver (account, profile, documents, services, and their
 * bookings/payments). Used to clear out unwanted/spam requests. */
export async function deleteDriver(driverProfileId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const profile = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    select: { userId: true },
  });
  if (!profile) return { ok: false, error: "Driver not found." };

  try {
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { userId: profile.userId } }),
      prisma.booking.deleteMany({ where: { driverProfileId } }),
      // Deleting the user cascades the profile, its documents, and its services.
      prisma.user.delete({ where: { id: profile.userId } }),
    ]);
  } catch {
    return { ok: false, error: "Could not delete this driver." };
  }
  revalidatePath("/admin");
  revalidatePath("/find-a-driver");
  return { ok: true };
}
