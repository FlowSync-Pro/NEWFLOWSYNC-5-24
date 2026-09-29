import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { FLEET, fleetOfferSavings, OFFER_WINDOW_HOURS, offerExpired, premiumOfferPrice } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";
import TrackEvent from "@/components/TrackEvent";
import FleetOfferButtons from "@/components/FleetOfferButtons";
import { FleetBiddingStory, FleetDisclaimer } from "@/components/FleetPitch";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You're on Premium — one more thing",
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

// Offer page B. A driver just paid for Premium (outright, via offer page A, or
// from their account). The fleet at its offer price, open for a stated window.
// Claims about work are conditional on where they are — no volume promised.
export default async function FleetOfferPage({ searchParams }: PageProps<"/welcome/fleet-offer">) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : Array.isArray(sp.session_id) ? sp.session_id[0] : "";
  if (!sessionId) redirect("/signin?checkout=success");

  let purchaseValue = premiumOfferPrice();
  const stripe = getStripe();
  if (stripe) {
    try {
      const cs = await stripe.checkout.sessions.retrieve(sessionId);
      const md = cs.metadata ?? {};
      const isPremiumPurchase = md.type === "upgrade" || (md.type === "listing" && md.tier === "premium");
      if (cs.payment_status !== "paid" || !isPremiumPurchase) redirect("/signin?checkout=success");
      if (offerExpired(cs.created)) redirect("/signin?checkout=success");
      if (typeof cs.amount_total === "number") purchaseValue = cs.amount_total / 100;
    } catch {
      redirect("/signin?checkout=success");
    }
  }

  return (
    <div className="relative min-h-[80vh]">
      {/* The Premium purchase's Purchase event, keyed to its own session id (CAPI dedupes). */}
      <TrackEvent event="Purchase" value={purchaseValue} eventId={sessionId} />
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto max-w-3xl px-5 py-12">
        <div className="card flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-[#04130a]">
            <Check />
          </span>
          <div className="flex-1">
            <p className="text-base font-bold">You&apos;re on Premium.</p>
            <p className="text-sm text-muted">The tools, the guides, and the course are unlocked the moment you sign in.</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            One-time offer · open for {OFFER_WINDOW_HOURS} hours
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Want loads dispatched to you? Get activated on our carrier account for ${FLEET.addOnPrice}.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            The Curri fleet invite is ${FLEET.price} from your account. Right here, right after Premium, it&apos;s
            ${FLEET.addOnPrice} more — ${fleetOfferSavings()} less than joining later.
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
              <span className="text-3xl font-extrabold text-accent">${FLEET.addOnPrice}</span>
              <span className="ml-2 text-sm text-muted line-through">${FLEET.price}</span>
              <span className="block text-xs text-muted">one-time · this page only</span>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-muted">
            <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{FLEET.dispatchFeePercent}% dispatching fee on loads we bring you, paid every Friday. No monthly fee, no insurance charge.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />Paid through Stripe as an independent contractor, 1099 at year end.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{FLEET.refundShort}</li>
          </ul>
          <div className="mt-6">
            <FleetOfferButtons sessionId={sessionId} />
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            Open for {OFFER_WINDOW_HOURS} hours after your Premium purchase. After that, the fleet is ${FLEET.price} from your account.
            You&apos;ll confirm the refund terms on the checkout page.
          </p>
          <div className="mt-5"><FleetDisclaimer /></div>
        </div>
      </div>
    </div>
  );
}
