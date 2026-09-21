import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { inviteMatchesUser, verifyReviewInviteToken } from "@/lib/review-invite";
import ReviewForm from "@/components/ReviewForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Share your experience",
  description: "Help other drivers decide by sharing your FlowSync experience.",
  robots: { index: false },
};

export default async function ShareExperiencePage({ searchParams }: PageProps<"/account/share-experience">) {
  const sp = await searchParams;
  const inviteRaw = typeof sp.invite === "string" ? sp.invite : Array.isArray(sp.invite) ? sp.invite[0] : "";

  const session = await getSession();
  if (!session) {
    // Invite links arrive by email/text, often on a phone that isn't signed
    // in. Sign-in always lands on the dashboard, so instead of bouncing them
    // (and losing the token) explain the two taps: sign in, then reopen the link.
    if (!inviteRaw) redirect("/signin");
    return (
      <div className="relative">
        <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
        <div className="relative mx-auto max-w-2xl px-5 py-12">
          <h1 className="text-3xl font-bold tracking-tight">Almost there</h1>
          <div className="card mt-8 p-7">
            <p className="font-semibold">Sign in first, then open this link again.</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Your review link is tied to your FlowSync account, so we need to know it&apos;s you. Sign
              in, then tap the link in your email or text one more time and the review form will be
              waiting.
            </p>
            <Link href="/signin" className="btn-primary mt-5 inline-flex rounded-full px-6 py-2.5 text-sm">
              Sign in to FlowSync
            </Link>
          </div>
        </div>
      </div>
    );
  }
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

  // Reviews are by invitation. A valid token for THIS driver unlocks the form;
  // a driver with an existing review may still edit it (edits go back to
  // pending). Everyone else sees why the form is locked instead of a form
  // that fails on submit.
  const invited = inviteMatchesUser(inviteRaw, session.userId);
  const inviteForSomeoneElse = !!inviteRaw && !invited && verifyReviewInviteToken(inviteRaw) !== null;
  const canReview = invited || !!existing;

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Share your experience</h1>
        <p className="mt-3 text-muted">
          Tell other drivers what working with FlowSync has actually been like. Honest reviews help
          the right drivers find us — and help us know what to fix. Your name shows as your first
          name and last initial only.
        </p>

        {canReview ? (
          <div className="card mt-8 p-7">
            <ReviewForm
              inviteToken={invited ? inviteRaw : undefined}
              initialRating={existing?.rating}
              initialText={existing?.text}
              initialStatus={existing?.status ?? null}
            />
          </div>
        ) : (
          <div className="card mt-8 p-7">
            <p className="font-semibold">Reviews are by invitation.</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {inviteForSomeoneElse
                ? "This review link was sent to a different driver's account. Sign in with the account the invite was sent to, or ask Nas for a link of your own."
                : inviteRaw
                  ? "This review link has expired or isn't valid. Ask Nas for a fresh one — links stay good for 90 days."
                  : "We collect reviews from drivers who are actively running loads with us, so every review on the site comes from real, working experience. If that's you, Nas will send you a review link by email or text — or just ask him for one."}
            </p>
            <Link href="/account" className="btn-ghost mt-5 inline-flex rounded-full px-5 py-2.5 text-sm">
              ← Back to your account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
