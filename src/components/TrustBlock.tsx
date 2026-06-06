import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/site";
import { GUARANTEE_DAYS } from "@/lib/pricing";

/** Dense, specific trust signals shown above the order summary on /pricing.
 * Every claim is concrete and verifiable on this same site — no badges, no
 * "as seen on TV" filler. The goal is to clear the last skeptical-buyer
 * hurdles right before the buy button. */
export default function TrustBlock() {
  return (
    <section aria-labelledby="trust-heading" className="mx-auto mt-10 max-w-3xl">
      <h2 id="trust-heading" className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
        Why drivers trust FlowSync
      </h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {/* Real human support */}
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M4 6h16v12H4z" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            <p className="font-semibold">A real person reads every reply</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-accent hover:underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            with any question, before or after you pay. We answer within 24 hours.
          </p>
        </div>

        {/* No subscription, no hidden fees */}
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M3 12h18M9 6l-3 6 3 6M15 6l3 6-3 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="font-semibold">One-time $17. Pay once.</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            No subscription, no auto-renewal, no &ldquo;we&apos;ll charge you again next month&rdquo;.
            Stripe charges your card exactly one time. We&apos;ll never debit you again.
          </p>
        </div>

        {/* Real money-back guarantee */}
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />
                <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="font-semibold">{GUARANTEE_DAYS}-day money-back guarantee</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            Not happy in {GUARANTEE_DAYS} days? Email us, we refund the full $17 — no questions, no
            hoops. Refunded to your original card within 5–10 days.{" "}
            <Link href="/refund-policy" className="text-accent hover:underline">
              See the policy
            </Link>
            .
          </p>
        </div>

        {/* Secure checkout */}
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
              </svg>
            </span>
            <p className="font-semibold">Your card stays with Stripe</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            Checkout runs entirely on Stripe — your card details never touch FlowSync&apos;s servers.
            Same payment processor used by Apple, Amazon, and Shopify.
          </p>
        </div>
      </div>

      {/* Quiet identifiers — the kind of detail a real business has and a fake one doesn't */}
      <p className="mt-5 text-center text-xs text-muted">
        Run by Barham Transport LLC · US-based ·{" "}
        <Link href="/terms" className="hover:text-foreground">Terms</Link>{" "}·{" "}
        <Link href="/privacy" className="hover:text-foreground">Privacy</Link>{" "}·{" "}
        <Link href="/refund-policy" className="hover:text-foreground">Refund policy</Link>
      </p>
    </section>
  );
}
