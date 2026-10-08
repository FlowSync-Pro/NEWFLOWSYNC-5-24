"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { sendDriverApprovedEmail, sendDriverWelcomeEmail, sendPremiumUpgradeEmail, sendReviewInviteEmail, sendStripeSetupEmail, sendTempPasswordEmail } from "@/lib/email";
import { serviceToEnum } from "@/lib/enums";
import { getService } from "@/lib/services";
import type { ServiceId } from "@/lib/services";
import { SITE_URL } from "@/lib/site";
import { createReviewInviteToken, REVIEW_INVITE_DAYS } from "@/lib/review-invite";
import { alertIfEmailFailed } from "@/lib/alerts";
import { sendAddCityBatch, type AddCityBatchResult } from "@/lib/add-city-email";
import { ensureConnectAccount, syncConnectStatus, type ConnectSync } from "@/lib/stripe-connect";
import { cancelPayout as cancelPayoutRow, logDelivery, parseDollars, payAllPending as payAllPendingRows, payPayout, type PayAllSummary, type PayResult } from "@/lib/payouts";
import { linkPayout } from "@/lib/dispatch";
import type { PayPlan } from "@prisma/client";

// ---- Fleet payouts (Stripe Connect phase 2) ------------------------------

/** Standard (Friday, 15%) or faster (on logging, 20%). Only affects deliveries logged from now on. */
export async function setPayPlan(driverProfileId: string, plan: PayPlan): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (plan !== "STANDARD" && plan !== "FASTER") return { ok: false, error: "Unknown plan." };
  const driver = await prisma.driverProfile.findUnique({ where: { id: driverProfileId }, select: { userId: true } });
  if (!driver) return { ok: false, error: "Driver not found." };
  await prisma.user.update({ where: { id: driver.userId }, data: { payPlan: plan } });
  revalidatePath(`/admin/drivers/${driverProfileId}`);
  return { ok: true };
}

/**
 * Log one completed delivery. `payNow` transfers immediately (the FASTER
 * plan's normal path; also allowed for a STANDARD driver when the owner wants).
 */
export async function logDeliveryForDriver(
  driverProfileId: string,
  input: { amount: string; deliveredOn: string; note: string; payNow: boolean; dispatchLoadId?: string },
): Promise<{ ok: true; payoutId: string; netCents: number; pay?: PayResult } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const driver = await prisma.driverProfile.findUnique({ where: { id: driverProfileId }, select: { userId: true } });
  if (!driver) return { ok: false, error: "Driver not found." };
  const loadCents = parseDollars(input.amount);
  if (loadCents === null) return { ok: false, error: "Enter the load amount in dollars, e.g. 145.00." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deliveredOn)) return { ok: false, error: "Pick the delivery date." };
  const deliveredOn = new Date(`${input.deliveredOn}T12:00:00Z`);
  if (Number.isNaN(deliveredOn.getTime())) return { ok: false, error: "Pick the delivery date." };

  const logged = await logDelivery({ userId: driver.userId, loadCents, deliveredOn, note: input.note, createdById: adminId });
  if (!logged.ok) return logged;
  if (input.dispatchLoadId) {
    await linkPayout(input.dispatchLoadId, logged.payoutId, adminId);
    revalidatePath(`/admin/dispatch/${input.dispatchLoadId}`);
    revalidatePath("/admin/dispatch");
  }
  const pay = input.payNow ? await payPayout(logged.payoutId) : undefined;
  revalidatePath(`/admin/drivers/${driverProfileId}`);
  revalidatePath("/admin/payouts");
  return { ok: true, payoutId: logged.payoutId, netCents: logged.netCents, pay };
}

/** Pay (or retry) one payout now. */
export async function payPayoutNow(payoutId: string): Promise<PayResult> {
  await requireAdmin();
  const r = await payPayout(payoutId);
  revalidatePath("/admin/payouts");
  return r;
}

/** Friday: every pending payout, one transfer each. */
export async function payAllPending(): Promise<{ ok: true; summary: PayAllSummary }> {
  await requireAdmin();
  const summary = await payAllPendingRows();
  revalidatePath("/admin/payouts");
  return { ok: true, summary };
}

export async function cancelPayout(payoutId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const r = await cancelPayoutRow(payoutId);
  revalidatePath("/admin/payouts");
  return r;
}

/**
 * Fleet payouts: create the driver's Stripe Express account if they don't
 * have one, then email them the Payouts page where they finish Stripe's form.
 * Safe to click again — it resends the email, never makes a second account.
 */
export async function sendStripeSetupLink(driverProfileId: string): Promise<{ ok: true; created: boolean; emailSent: boolean } | { ok: false; error: string }> {
  await requireAdmin();
  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    select: { userId: true, firstName: true, user: { select: { email: true } } },
  });
  if (!driver) return { ok: false, error: "Driver not found." };
  try {
    const acct = await ensureConnectAccount(driver.userId);
    if (!acct.ok) return acct;
    const res = await sendStripeSetupEmail({ to: driver.user.email, firstName: driver.firstName, payoutsUrl: `${SITE_URL}/account/payouts` });
    await alertIfEmailFailed(res);
    revalidatePath(`/admin/drivers/${driverProfileId}`);
    return { ok: true, created: acct.created, emailSent: res.sent };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[connect] setup link failed:", msg);
    return { ok: false, error: `Stripe said: ${msg}` };
  }
}

/** Fleet payouts: re-read the driver's Stripe account status (no email, no changes in Stripe). */
export async function refreshStripeConnectStatus(driverProfileId: string): Promise<{ ok: true; sync: ConnectSync | null } | { ok: false; error: string }> {
  await requireAdmin();
  const driver = await prisma.driverProfile.findUnique({ where: { id: driverProfileId }, select: { userId: true } });
  if (!driver) return { ok: false, error: "Driver not found." };
  const sync = await syncConnectStatus(driver.userId);
  revalidatePath(`/admin/drivers/${driverProfileId}`);
  return { ok: true, sync };
}

/** Owner-only: send the one-time "Add your city" email to the next batch (see /admin/add-city). */
export async function sendAddCityEmails(): Promise<{ ok: true; result: AddCityBatchResult } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    const result = await sendAddCityBatch();
    revalidatePath("/admin/add-city");
    return { ok: true, result };
  } catch (e) {
    console.error("[add-city] batch failed:", e);
    return { ok: false, error: "The batch stopped partway. Reload the page to see how many are still waiting, then try again." };
  }
}

/**
 * Invite a driver who is actively running loads with us to leave a review.
 * Emails them a signed link and returns the same link so the admin can text it
 * (the owner reaches drivers by text more than email). Nothing is stored — the
 * link itself is the permission, valid for REVIEW_INVITE_DAYS.
 */
export async function sendReviewInvite(
  driverProfileId: string,
): Promise<{ ok: boolean; inviteUrl?: string; emailSent?: boolean; expiresInDays?: number; error?: string }> {
  await requireAdmin();
  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!driver) return { ok: false, error: "Driver not found." };

  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  const token = createReviewInviteToken(driver.user.id);
  const inviteUrl = `${base}/account/share-experience?invite=${encodeURIComponent(token)}`;

  const { sent } = await sendReviewInviteEmail({
    to: driver.user.email,
    firstName: driver.firstName,
    inviteUrl,
  });

  return { ok: true, inviteUrl, emailSent: sent, expiresInDays: REVIEW_INVITE_DAYS };
}

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
  await alertIfEmailFailed(await sendTempPasswordEmail({
    to: driver.user.email,
    firstName: driver.firstName,
    tempPassword,
    signInUrl: `${base}/signin`,
  }));

  return { ok: true, tempPassword };
}

/** Mark (or unmark) a driver as a Curri fleet member — for drivers who paid the
 * joining fee another way (text/payment link) so they're recorded like Stripe
 * buyers. Only touches the fleetJoinedAt date on the user. */
export async function setFleetJoined(driverProfileId: string, joined: boolean): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    select: { userId: true, user: { select: { fleetJoinedAt: true } } },
  });
  if (!driver) return { ok: false, error: "Driver not found." };
  await prisma.user.update({
    where: { id: driver.userId },
    data: { fleetJoinedAt: joined ? (driver.user.fleetJoinedAt ?? new Date()) : null },
  });
  revalidatePath("/admin");
  return { ok: true };
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
    await alertIfEmailFailed(await sendPremiumUpgradeEmail({
      to: driver.user.email,
      firstName: driver.firstName,
      accountUrl: `${base}/account`,
    }));
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
  await alertIfEmailFailed(await sendDriverApprovedEmail({
    to: driver.user.email,
    firstName: driver.firstName,
    profileUrl: `${base}/profile`,
  }));

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
  } catch (e) {
    // Most likely an FK constraint (e.g. the driver also has bookings as a
    // customer, which have no cascade). Log the cause so it's diagnosable.
    console.error(`deleteDriver failed for profile ${driverProfileId}:`, e);
    return { ok: false, error: "Could not delete this driver." };
  }
  revalidatePath("/admin");
  revalidatePath("/find-a-driver");
  return { ok: true };
}

export interface CreateDriverState {
  ok?: boolean;
  error?: string;
  tempPassword?: string;
}

/**
 * Admin manually creates a driver with a free listing (no payment). The driver
 * is created verified + listed so they show in the directory immediately, and
 * gets a temporary password (emailed, and returned so the admin can relay it).
 */
export async function adminCreateDriver(_prev: CreateDriverState, formData: FormData): Promise<CreateDriverState> {
  await requireAdmin();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawService = String(formData.get("primaryService") ?? "");
  const tier = String(formData.get("tier") ?? "STANDARD") === "PREMIUM" ? "PREMIUM" : "STANDARD";

  if (!firstName || !lastName || !email) return { error: "First name, last name, and email are required." };
  if (!email.includes("@")) return { error: "Enter a valid email." };

  // "undecided" (or any non-listed value) means the driver hasn't picked yet —
  // create the account anyway; they pick the service from their account later.
  const primaryService = getService(rawService)
    ? serviceToEnum(rawService as ServiceId)
    : null;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const tempPassword = generateTempPassword();
  await prisma.user.create({
    data: {
      email,
      name: `${firstName} ${lastName}`.trim(),
      role: "DRIVER",
      hashedPassword: hashPassword(tempPassword),
      mustResetPassword: true,
      emailVerified: new Date(),
      driverProfile: {
        create: {
          firstName,
          lastName,
          primaryService,
          tier,
          verified: true,
          listedAt: new Date(),
        },
      },
    },
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  await alertIfEmailFailed(await sendDriverWelcomeEmail({ to: email, firstName, tempPassword, signInUrl: `${base}/signin`, challenge: false }));

  revalidatePath("/admin");
  revalidatePath("/find-a-driver");
  return { ok: true, tempPassword };
}
