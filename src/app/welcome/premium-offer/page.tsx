import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { GUARANTEE_DAYS, listingPrice, OFFER_WINDOW_HOURS, offerExpired, premiumOfferPrice, premiumUpgradePrice, TIERS } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";
import TrackEvent from "@/components/TrackEvent";
import PremiumOfferButtons from "@/components/PremiumOfferButtons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome — one quick thing",
  robots: { index: false },
  alternates: { canonical: `${SITE_URL}/welcome/premium-offer` },
};

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Offer page A. A driver just paid for Verified. This page has one job: make
// the $50 Premium decision easy and honest — what it adds, what it costs here,
// what it costs later, and how long the offer is open. No fake timers.
const WHY = [
  {
    t: "Know what a load is worth before you tap accept",
    d: "The bidding calculator turns the listed price, the miles, and your real cost per mile into a floor and a bid. Gig drivers accept; carriers bid.",
  },
  {
    t: "See your real cost per mile every week",
    d: "The business P&L tracker splits business and personal expenses and shows rate per mile, cost per mile, and net income by week, month, and quarter.",
  },
  {
    t: "Learn exactly how one rented van became four Sprinters",
    d: "The Curri mastermind course: carrier accounts, bidding, vehicle classes, two logins, filling the gaps, getting paid.",
  },
  {
    t: "Stand out in the directory",
    d: "Premium badge, priority placement above other drivers, and your own website link on your profile.",
  },
];

export default async function PremiumOfferPage({ searchParams }: PageProps<"/welcome/premium-offer">) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : Array.isArray(sp.session_id) ? sp.session_id[0] : "";
  if (!sessionId) redirect("/signin?checkout=success");

  let purchaseValue = listingPrice();
  const stripe = getStripe();
  if (stripe) {
    try {
      const cs = await stripe.checkout.sessions.retrieve(sessionId);
      if (cs.payment_status !== "paid" || cs.metadata?.type !== "listing") redirect("/signin?checkout=success");
      // Bought Premium outright → straight to the fleet offer.
      if (cs.metadata?.tier === "premium") redirect(`/welcome/fleet-offer?session_id=${encodeURIComponent(sessionId)}`);
      // The offer is open for a stated window; after that, the account price applies.
      if (offerExpired(cs.created)) redirect("/signin?checkout=success");
      if (typeof cs.amount_total === "number") purchaseValue = cs.amount_total / 100;
    } catch {
      redirect("/signin?checkout=success");
    }
  }

  const offer = premiumOfferPrice();
  const later = premiumUpgradePrice();

  return (
    <div className="relative min-h-[80vh]">
      <TrackEvent event="Purchase" value={purchaseValue} eventId={sessionId} />
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto max-w-3xl px-5 py-12">
        {/* Receipt */}
        <div className="card flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-[#04130a]">
            <Check />
          </span>
          <div className="flex-1">
            <p className="text-base font-bold">Payment received. You&apos;re in.</p>
            <p className="text-sm text-muted">Your welcome email is on the way — check inbox (and spam) for your sign-in details.</p>
          </div>
        </div>

        {/* The decision */}
        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            One-time offer · open for {OFFER_WINDOW_HOURS} hours
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Before you sign in: Premium for ${offer} instead of ${later}.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            Premium&apos;s ${TIERS.premium.price} price includes the listing you just bought, so right now it&apos;s the
            ${offer} difference. From your account later it&apos;s the full ${later}. Same {GUARANTEE_DAYS}-day
            money-back guarantee either way.
          </p>
        </div>

        {/* Why it's worth it */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {WHY.map((w) => (
            <div key={w.t} className="card p-5">
              <p className="font-semibold">{w.t}</p>
              <p className="mt-1 text-sm text-muted">{w.d}</p>
            </div>
          ))}
        </div>

        {/* Honest framing — the push, without the pressure */}
        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6">
          <p className="font-semibold text-amber-200">Here&apos;s the straight version.</p>
          <p className="mt-1 text-sm text-muted">
            The listing gets you found. Premium is what makes the work profitable: it&apos;s the difference
            between accepting a $100 load and bidding $300 on it because you knew your numbers. Most drivers who
            take it, take it right here, because ${offer} now is the same product as ${later} next month. If
            you&apos;d rather see the listing work first, that&apos;s fine too — nothing here renews or charges you later.
          </p>
        </div>

        {/* CTA */}
        <div className="card mt-8 p-7">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold">Add Premium</span>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-accent">${offer}</span>
              <span className="ml-2 text-sm text-muted line-through">${later}</span>
              <span className="block text-xs text-muted">one-time · this page only</span>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-muted">
            {TIERS.premium.features.slice(1).map((f) => (
              <li key={f} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{f}</li>
            ))}
          </ul>
          <div className="mt-6">
            <PremiumOfferButtons sessionId={sessionId} />
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            Open for {OFFER_WINDOW_HOURS} hours after your purchase. After that, Premium is ${later} from your account.{" "}
            {GUARANTEE_DAYS}-day money-back guarantee. Secure Stripe checkout with your email pre-filled.
          </p>
        </div>
      </div>
    </div>
  );
}
