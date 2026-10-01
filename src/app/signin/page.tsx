import type { Metadata } from "next";
import { AuthPanel, ActivateAccountForm } from "@/components/AuthForm";
import TrackEvent from "@/components/TrackEvent";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { FLEET, listingPrice, OFFER_WINDOW_HOURS, premiumUpgradePrice } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your FlowSync driver account.",
  robots: { index: false },
};

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const sp = await searchParams;
  const paid = sp.checkout === "success";
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : undefined;
  // An offer page link opened after its window closed (e.g. from the welcome email).
  const offerEnded = sp.offer === "ended";

  // Report the real amount paid to the Meta Pixel so Meta can optimize for
  // value (a $97 Premium reports 97, a $17+bumps reports its true total) and
  // the lookalike seed is clean. Falls back to the $17 core listing.
  let purchaseValue = listingPrice();
  // Whether to offer on-screen activation: the driver just paid but hasn't set
  // a password yet, so we let them choose one here instead of stranding them
  // if the welcome email is slow, filtered, or never arrives.
  let canActivate = false;
  // The account already had a password before this purchase (admin-added and
  // activated, imported, or a returning buyer): no temp password was emailed.
  let hasPassword = false;

  if (paid && sessionId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const cs = await stripe.checkout.sessions.retrieve(sessionId);
        if (typeof cs.amount_total === "number") purchaseValue = cs.amount_total / 100;

        const email = (cs.customer_details?.email ?? cs.metadata?.email ?? "").trim().toLowerCase();
        if (cs.payment_status === "paid" && email) {
          const user = await prisma.user.findUnique({
            where: { email },
            select: { mustResetPassword: true },
          });
          // Only while the account is still un-activated — once a password is
          // set this offer disappears (the action enforces this too).
          canActivate = !!user?.mustResetPassword;
          hasPassword = !!user && !user.mustResetPassword;
        }
      } catch {
        // Retrieval can fail (test/live key mismatch, expired session) — keep the
        // fallback value and just show the normal sign-in form.
      }
    }
  }

  return (
    <div className="relative min-h-[70vh]">
      {/* Only for a real checkout: without a session id Meta can't de-duplicate
          the event, and there's no proof anything was bought. */}
      {paid && sessionId && <TrackEvent event="Purchase" value={purchaseValue} eventId={sessionId} />}
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto flex max-w-md flex-col px-5 py-20">
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {canActivate ? "You're in — set your password" : "Your driver account"}
        </h1>
        {offerEnded ? (
          <p className="mt-2 text-center text-muted">
            That offer has ended — it was open for {OFFER_WINDOW_HOURS} hours after your purchase. Premium is $
            {premiumUpgradePrice()} and the Curri fleet is ${FLEET.price}, both from your account. Sign in below to see them.
          </p>
        ) : canActivate ? (
          <p className="mt-2 text-center text-accent">
            Payment received! Choose a password below and you&apos;ll go straight to your dashboard.
          </p>
        ) : paid && hasPassword ? (
          <p className="mt-2 text-center text-accent">Payment received! It&apos;s on your existing account — sign in below with your password.</p>
        ) : paid ? (
          <p className="mt-2 text-center text-accent">Payment received! Check your email for your temporary password, then sign in below.</p>
        ) : (
          <p className="mt-2 text-center text-muted">Sign in to manage your profile, documents, and bookings.</p>
        )}

        {canActivate && sessionId ? (
          <>
            <div className="card mt-8 p-7">
              <ActivateAccountForm sessionId={sessionId} />
            </div>
            <details className="mt-5 text-center">
              <summary className="cursor-pointer text-sm text-muted hover:text-foreground">
                Already have a password? Sign in instead
              </summary>
              <div className="card mt-4 p-7 text-left">
                <AuthPanel />
              </div>
            </details>
          </>
        ) : (
          <div className="card mt-8 p-7">
            <AuthPanel />
          </div>
        )}
      </div>
    </div>
  );
}
