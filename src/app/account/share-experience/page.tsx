import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import ReviewForm from "@/components/ReviewForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Share your experience",
  description: "Help other drivers decide by sharing your FlowSync signup experience.",
  robots: { index: false },
};

export default async function ShareExperiencePage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!profile) redirect("/account/setup");

  const existing = await prisma.review.findUnique({
    where: { userId: session.userId },
    select: { rating: true, text: true, status: true },
  });

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Share your experience</h1>
        <p className="mt-3 text-muted">
          Tell other drivers what signing up for FlowSync was actually like. Honest reviews help the
          right drivers find us — and help us know what to fix. Your name shows as your first name
          and last initial only.
        </p>

        <div className="card mt-8 p-7">
          <ReviewForm
            initialRating={existing?.rating}
            initialText={existing?.text}
            initialStatus={existing?.status ?? null}
          />
        </div>
      </div>
    </div>
  );
}
