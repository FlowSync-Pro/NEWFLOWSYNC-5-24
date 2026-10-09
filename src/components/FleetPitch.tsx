import { FLEET } from "@/lib/pricing";

/**
 * The two pieces of fleet copy that must read the same everywhere they appear
 * (homepage, the post-checkout offer, the in-account guide): what it costs, and
 * why bidding beats a gig account. Server component — plain JSX, no state.
 */

export function FleetTerms({ standalone }: { standalone?: boolean }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-muted">
      <li>
        <strong className="font-semibold text-foreground">${FLEET.price} one-time</strong> to join
        {standalone ? " — includes your full FlowSync driver account" : ""}. No
        monthly fee, no insurance charges.
      </li>
      <li>
        <strong className="font-semibold text-foreground">{FLEET.dispatchFeePercent}% dispatching fee</strong>{" "}
        on loads we bring you, taken from the load. Paid every Friday.
      </li>
      <li>We only earn when you do. No loads that week means no fee that week.</li>
      <li>Everything in Premium is included: the tools, the ads guide, the Curri mastermind course.</li>
      <li>
        <strong className="font-semibold text-foreground">Refund:</strong> {FLEET.refundShort}
      </li>
    </ul>
  );
}

/** The honest capacity note, shown only where someone can join (not to members). */
export function FleetCapNote() {
  return (
    <p className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm leading-relaxed text-foreground/90">
      <strong className="font-semibold text-accent">Up to {FLEET.monthlyCap} new fleet drivers a month.</strong>{" "}
      I personally activate every driver on our carrier account, so I cap how many I take on. If this
      month&apos;s spots are taken when you join, you&apos;re first in line for next month, and your fee
      stays fully refundable until you&apos;re activated.
    </p>
  );
}

/**
 * Pay-over-time note (option A, owner decision 2026-10-01): Klarna, Afterpay
 * and Affirm are switched on in the Stripe Dashboard. The lender pays the full
 * price up front, so nothing here changes the price, the checkout or what Meta
 * is told. "If you're eligible": the lenders decide, and each has its own
 * minimum. Bank-transfer methods (ACH) must stay OFF — the webhook activates
 * on checkout completion, before a bank transfer has cleared.
 */
export function FleetPayLaterNote() {
  return (
    <p className="text-center text-xs text-muted">
      Prefer to pay over time? Klarna, Afterpay or Affirm at checkout, if you&apos;re eligible.
    </p>
  );
}

export function FleetBiddingStory({ compact }: { compact?: boolean }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted">
      <p>
        <strong className="font-semibold text-foreground">Gig accounts wait to be offered. We bid.</strong>{" "}
        A delivery app posts a load at a listed price. A driver on a gig account claims it at that price,
        or waits for a text offering a few dollars more and feels like they won. On our carrier account we
        don&apos;t claim at the listed price — we place bids, and when the load justifies it we aim to
        roughly double the payout.
      </p>
      <p>
        <strong className="font-semibold text-foreground">A real one from our own week.</strong>{" "}
        A load posted at $100.45. We bid $300 and won it. On the way there the app was still shopping the job to
        cheaper gig drivers — it texted one of them $145, he took it, and we both showed up at the pickup.
        He&apos;d got there first, so we let him have it. Same pickup, same drop-off, same pallet: he ran it
        for $145 when the shipper had already agreed to pay $300.
      </p>
      {!compact && (
        <p>
          That&apos;s one load, not a promise — every load is different and bids don&apos;t always win. But
          it&apos;s why the {FLEET.dispatchFeePercent}% dispatching fee pays for itself: keeping 85% of a
          $300 load beats keeping all of a $145 one.
        </p>
      )}
    </div>
  );
}

export function FleetDisclaimer() {
  return (
    <p className="text-xs leading-relaxed text-muted">
      Operated by Barham Transport LLC. FlowSync and Barham Transport are independent and are not owned by,
      affiliated with, or part of Curri. Fleet drivers are independent contractors, paid through Stripe
      Connect with a 1099 at year end. No guarantee of load volume or earnings. The joining fee is
      fully refundable until you&apos;re activated on our carrier account; after activation it&apos;s
      refunded in full if your take-home from fleet loads in your first {FLEET.guaranteeDays} days is under
      the fee you paid (ask within {FLEET.guaranteeClaimDays} days after); removal from the fleet for two
      violations on the carrier account means no refund. Full terms: <a href="/refund-policy" className="underline">refund policy</a>.
    </p>
  );
}
