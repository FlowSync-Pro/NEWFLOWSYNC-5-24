import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import AdminReviews, { type AdminReviewRow } from "@/components/AdminReviews";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews — Admin",
  robots: { index: false },
};

export default async function AdminReviewsPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const adminId = await getAdminUserId();
  if (!adminId) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <div className="card p-10">
          <h1 className="text-xl font-bold">Not authorized</h1>
          <p className="mt-3 text-sm text-muted">
            This area is for FlowSync admins.
          </p>
          <Link href="/account" className="btn-ghost mt-6 inline-flex rounded-full px-6 py-2.5 text-sm">Back to account</Link>
        </div>
      </div>
    );
  }

  const rows = await prisma.review.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { email: true } } },
  });

  const reviews: AdminReviewRow[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    text: r.text,
    status: r.status,
    displayName: r.displayName,
    city: r.city,
    email: r.user.email,
    createdAt: r.createdAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
  }));

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-48" />
      <div className="relative mx-auto max-w-5xl px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Driver reviews</h1>
            <p className="mt-1 text-muted">Approve to publish on the public reviews page + pricing.</p>
          </div>
          <Link href="/admin" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Admin dashboard</Link>
        </div>
        <div className="mt-8">
          <AdminReviews reviews={reviews} />
        </div>
      </div>
    </div>
  );
}
