"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/admin";
import { inviteMatchesUser } from "@/lib/review-invite";

export interface ReviewState {
  ok?: boolean;
  error?: string;
}

/** Driver submits (or edits) their FlowSync review.
 * Reviews are by invitation: a NEW review needs a valid invite token for this
 * exact signed-in driver (the owner sends those only to drivers actively
 * running loads with us). A driver who already has a review may edit it
 * without a token — they were vetted once, and edits reset to PENDING for
 * re-approval anyway. One per driver either way. */
export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in to leave a review." };

  const invite = String(formData.get("invite") ?? "");
  if (!inviteMatchesUser(invite, session.userId)) {
    const existing = await prisma.review.findUnique({ where: { userId: session.userId }, select: { id: true } });
    if (!existing) {
      return { error: "Reviews are by invitation. If you're running loads with us, ask Nas for your review link." };
    }
  }

  const ratingRaw = String(formData.get("rating") ?? "");
  const text = String(formData.get("text") ?? "").trim();

  const rating = Number.parseInt(ratingRaw, 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { error: "Pick a star rating from 1 to 5." };
  }
  if (text.length < 30) return { error: "A few sentences (at least 30 characters) please." };
  if (text.length > 600) return { error: "Keep it under 600 characters." };

  // Snapshot display fields so they don't change later.
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    select: { firstName: true, lastName: true, city: true },
  });
  const displayName = profile
    ? `${profile.firstName} ${profile.lastName.charAt(0)}.`.trim()
    : null;
  const city = profile?.city ?? null;

  await prisma.review.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      rating,
      text,
      displayName,
      city,
      // status defaults to PENDING; approvedAt stays null
    },
    update: {
      rating,
      text,
      displayName,
      city,
      // Resubmitting resets to PENDING — admin must re-approve edits.
      status: "PENDING",
      approvedAt: null,
    },
  });

  revalidatePath("/account/share-experience");
  revalidatePath("/admin/reviews");
  // Approved-review surfaces will be refreshed by the admin approve flow.
  return { ok: true };
}

export async function approveReview(reviewId: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  // Refresh every public surface that lists reviews.
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/pricing");
  return { ok: true };
}

export async function rejectReview(reviewId: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "REJECTED", approvedAt: null },
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/pricing");
  return { ok: true };
}
