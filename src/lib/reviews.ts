import { prisma } from "@/lib/db";

export interface PublicReview {
  id: string;
  rating: number;
  text: string;
  displayName: string;
  city: string | null;
  approvedAt: Date;
}

/** Approved reviews for public display. Most recently approved first. */
export async function listPublicReviews(limit?: number): Promise<PublicReview[]> {
  const rows = await prisma.review.findMany({
    where: { status: "APPROVED" },
    orderBy: { approvedAt: "desc" },
    take: limit,
  });
  return rows
    .filter((r) => !!r.approvedAt)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      // Fall back to "FlowSync driver" if the snapshot was missing (shouldn't happen).
      displayName: r.displayName ?? "FlowSync driver",
      city: r.city,
      approvedAt: r.approvedAt as Date,
    }));
}

export interface ReviewSummary {
  count: number;
  averageRating: number; // 0-5, one decimal
}

export async function reviewSummary(): Promise<ReviewSummary> {
  const agg = await prisma.review.aggregate({
    where: { status: "APPROVED" },
    _count: { _all: true },
    _avg: { rating: true },
  });
  return {
    count: agg._count._all,
    averageRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
  };
}
