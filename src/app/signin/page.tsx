import type { Metadata } from "next";
import { AuthPanel } from "@/components/AuthForm";
import TrackEvent from "@/components/TrackEvent";
import { getStripe } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create your FlowSync driver account.",
  robots: { index: false },
};

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const sp = await searchParams;
  const paid = sp.checkout === "success";
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : undefined;

  // Report the real amount paid to the Meta Pixel so Meta can optimize for
  // value (a $97 Premium reports 97, a $17+bumps reports its true total) and
  // the lookalike seed is clean. Falls back to the $17 core listing.
  let purchaseValue = 17;
  if (paid && sessionId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const cs = await stripe.checkout.sessions.retrieve(sessionId);
        if (typeof cs.amount_total === "number") purchaseValue = cs.amount_total / 100;
      } catch {
        // Retrieval can fail (test/live key mismatch, expired session) — keep the fallback.
      }
    }
  }

  return (
    <div className="relative min-h-[70vh]">
      {paid && <TrackEvent event="Purchase" value={purchaseValue} eventId={sessionId} />}
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto flex max-w-md flex-col px-5 py-20">
        <h1 className="text-center text-3xl font-bold tracking-tight">Your driver account</h1>
        {paid ? (
          <p className="mt-2 text-center text-accent">Payment received! Check your email for your temporary password, then sign in below.</p>
        ) : (
          <p className="mt-2 text-center text-muted">Sign in or create an account to manage your profile and documents.</p>
        )}
        <div className="card mt-8 p-7">
          <AuthPanel />
        </div>
      </div>
    </div>
  );
}
