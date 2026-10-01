import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import {
  FLEET,
  fleetOfferPrice,
  fleetOfferSavings,
  fleetOfferTotal,
  listingPrice,
  OFFER_WINDOW_HOURS,
  offerExpired,
  premiumOfferPrice,
} from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";
import TrackEvent from "@/components/TrackEvent";
import FleetOfferButtons from "@/components/FleetOfferButtons";
import { FleetBiddingStory, FleetCapNote, FleetDisclaimer, FleetPayLaterNote } from "@/components/FleetPitch";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "One more thing before you sign in",
  robots: { index: false },
  alternates: { canonical: `${SITE_URL}/welcome/fleet-offer` },
};

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Offer page B — the fleet, reached two ways:
//   with Premium (took offer A, or bought Premium from the account): $150 more
//   without Premium (declined offer A):                               $200 more
// Both paths total $247 on the funnel. Open for OFFER_WINDOW_HOURS after the
// purchase that led here; then the fleet is $297 from the account. Claims
// about work stay conditional on the driver's market — no volume promised.
export default async function FleetOfferPage({ searchParams }: PageProps<"/welcome/fleet-offer">) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : Array.isArray(sp.session_id) ? sp.session_id[0] : "";
  // No purchase to show an offer for. Plain sign-in: "checkout=success" there
  // fires a Purchase pixel, which must only happen for a real payment.
  if (!sessionId) redirect("/signin");

  // Without Stripe (local/preview without keys) assume the Premium path so the page renders.
  let hasPremium = true;
  let premiumPurchaseValue: number | null = null;
  // redirect() works by throwing, so a try/catch would swallow it: decide the
  // destination inside the try, redirect after it.
  let dest: string | null = null;
  const stripe = getStripe();
  if (stripe) {
    try {
      const cs = await stripe.checkout.sessions.retrieve(sessionId);
      const md = cs.metadata ?? {};
      if (cs.payment_status !== "paid" || (md.type !== "upgrade" && md.type !== "listing")) dest = "/signin";
      else if (offerExpired(cs.created)) dest = "/signin?offer=ended";
      else {
        hasPremium = md.type === "upgrade" || md.tier === "premium";
        // Only a Premium purchase fires its Purchase pixel here; a Verified
        // buyer's listing Purchase already fired on offer page A.
        if (hasPremium) premiumPurchaseValue = typeof cs.amount_total === "number" ? cs.amount_total / 100 : premiumOfferPrice();
      }
    } catch {
      // Stripe didn't answer. Sign-in retries with the session id, so a real
      // buyer's Purchase still fires once and Meta can de-duplicate it.
      dest = `/signin?checkout=success&session_id=${encodeURIComponent(sessionId)}`;
    }
  }
  if (dest) redirect(dest);

  const price = fleetOfferPrice(hasPremium);
  const total = fleetOfferTotal();
  const savings = fleetOfferSavings(hasPremium);

  return (
    <div className="relative min-h-[80vh]">
      {premiumPurchaseValue !== null && <TrackEvent event="Purchase" value={premiumPurchaseValue} eventId={sessionId} />}
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto max-w-3xl px-5 py-12">
        <div className="card flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-[#04130a]">
            <Check />
          </span>
          <div className="flex-1">
            <p className="text-base font-bold">{hasPremium ? "You're on Premium." : "Payment received. You're in."}</p>
            <p className="text-sm text-muted">
              {hasPremium
                ? "The tools, the guides, and the course are unlocked the moment you sign in."
                : "Your welcome email is on the way — check inbox (and spam) for your sign-in details."}
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            One-time offer · open for {OFFER_WINDOW_HOURS} hours
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Want loads dispatched to you? Get activated on our carrier account for ${price} more.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            The Curri fleet invite is ${FLEET.price} from your account. Right here it&apos;s ${price} more
            {hasPremium ? "" : ", and it includes everything in Premium"} — ${savings} less than joining later.
            Your total today would be ${total}.
          </p>
        </div>

        {/* What actually happens */}
        <div className="card mt-8 p-6">
          <h2 className="text-lg font-bold">What happens after you say yes</h2>
          <ol className="mt-4 space-y-3">
            {[
              "You reply to one email with your city, vehicle, and the email for your Stripe payouts.",
              "We activate you on the Barham Transport carrier account — usually the same day we have your details. No waiting on your own Curri approval.",
              "Loads near you show up in the dispatch relay. We bid them, you run the ones you want, you're paid every Friday. How many you see depends on where you are: busier cities usually see opportunities right away, smaller markets take longer.",
            ].map((s, i) => (
              <li key={s} className="flex gap-3 text-sm text-muted">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="card mt-4 p-6">
          <h2 className="text-lg font-bold">Why the {FLEET.dispatchFeePercent}% is worth it</h2>
          <div className="mt-3"><FleetBiddingStory /></div>
        </div>

        {/* CTA */}
        <div className="card mt-8 p-7">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold">Activate on the fleet</span>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-accent">${price}</span>
              <span className="ml-2 text-sm text-muted line-through">${FLEET.price}</span>
              <span className="block text-xs text-muted">more, one-time · this page only</span>
            </div>
          </div>
          <div className="mt-4"><FleetCapNote /></div>
          <ul className="mt-4 space-y-1.5 text-sm text-muted">
            {!hasPremium && (
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />Includes everything in Premium: the bidding calculator, the business P&amp;L tracker, every guide, the Curri mastermind, the badge and priority placement.</li>
            )}
            <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{FLEET.dispatchFeePercent}% dispatching fee on loads we bring you, paid every Friday. No monthly fee, no insurance charge.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />Paid through Stripe as an independent contractor, 1099 at year end.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{FLEET.refundShort}</li>
          </ul>
          <div className="mt-6">
            <FleetOfferButtons sessionId={sessionId} price={price} />
            <div className="mt-3"><FleetPayLaterNote /></div>
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            Open for {OFFER_WINDOW_HOURS} hours after your purchase. After that, the fleet is ${FLEET.price} from your account.
            You&apos;ll confirm the refund terms on the checkout page. Your card details stay with Stripe.
          </p>
          <div className="mt-5"><FleetDisclaimer /></div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Listing ${listingPrice()}{hasPremium ? ` + Premium $${premiumOfferPrice()}` : ""} + fleet ${price} = ${total} total. Everything one-time.
        </p>
      </div>
    </div>
  );
}
