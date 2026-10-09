import type { Metadata } from "next";
import Link from "next/link";
import FleetCheckout from "@/components/FleetCheckout";
import {
  FleetBiddingStory,
  FleetCapNote,
  FleetDisclaimer,
  FleetPayLaterNote,
  FleetTerms,
} from "@/components/FleetPitch";
import {
  FleetControlPoints,
  FleetFaq,
  FleetJoinTimeline,
  FleetOfferPreview,
  FleetRealLoads,
  fleetFaq,
} from "@/components/FleetDispatchExplainer";
import JsonLd, { breadcrumbLd, faqLd } from "@/components/JsonLd";
import { FLEET } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

const title = "Join the Curri Fleet — Loads Dispatched to Your Phone";
const description =
  "Run Curri loads on Barham Transport's carrier account — no waiting on your own approval. Offers arrive on Telegram with your pay shown up front, we bid the loads, and you're paid every Friday.";

// What the page sells, for search engines: the membership, its one-time price, who runs it.
const serviceLd = () => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Curri fleet membership for independent delivery drivers",
  serviceType: "Delivery load dispatch for independent drivers",
  description,
  url: `${SITE_URL}/curri-fleet`,
  areaServed: { "@type": "Country", name: "United States" },
  provider: { "@type": "Organization", name: "Barham Transport LLC", url: SITE_URL },
  offers: {
    "@type": "Offer",
    price: String(FLEET.price),
    priceCurrency: "USD",
    url: `${SITE_URL}/curri-fleet`,
    availability: "https://schema.org/InStock",
  },
});

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/curri-fleet` },
  openGraph: {
    type: "website",
    siteName: "FlowSync",
    title,
    description,
    url: `${SITE_URL}/curri-fleet`,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function CurriFleetLandingPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:pt-12">
      <JsonLd data={serviceLd()} />
      <JsonLd data={faqLd(fleetFaq())} />
      <JsonLd data={breadcrumbLd([{ name: "Curri fleet", path: "/curri-fleet" }])} />
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">
        Curri fleet · a separate opportunity
      </p>
      <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
        Want loads dispatched to you? Join our carrier fleet.
      </h1>
      <p className="mt-4 max-w-2xl text-muted">
        Barham Transport runs its own carrier account on Curri and dispatches nearby loads to fleet
        drivers. Offers land on your phone with your pay shown up front — tap Accept or Pass.
      </p>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div id="join" className="card order-1 scroll-mt-24 p-6 sm:p-7 lg:order-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Join the fleet</h2>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-accent">${FLEET.price}</span>
              <span className="ml-1 text-xs text-muted">one-time</span>
            </div>
          </div>
          <div className="mt-5">
            <FleetCheckout mode="standalone" />
          </div>
          <div className="mt-3">
            <FleetPayLaterNote />
          </div>
          <div className="mt-5">
            <FleetCapNote />
          </div>
          <div className="mt-4">
            <FleetTerms standalone />
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            Already a FlowSync driver?{" "}
            <Link href="/account/curri-fleet" className="font-medium text-accent underline-offset-4 hover:underline">
              Join from your account →
            </Link>
          </p>
          <div className="mt-5 border-t border-border pt-4">
            <FleetDisclaimer />
          </div>
        </div>

        <div className="order-2 lg:order-1">
          <h2 className="text-lg font-bold">How it works</h2>
          <p className="mt-3 text-muted">
            You get on our account instead of waiting on your own approval, we bid the loads, you run
            the ones you want, and you&apos;re paid every Friday as an independent contractor.
          </p>
          <div className="mt-6">
            <FleetBiddingStory />
          </div>
        </div>
      </div>

      {/* How dispatch works — the real offer format and what the driver controls. */}
      <section className="mt-20 grid items-start gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">How a load reaches you</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">The offer comes to your phone. You decide.</h2>
          <p className="mt-3 text-muted">
            No refreshing an app and no guessing what a load pays. When a load fits your vehicle and your radius
            while you&apos;re Active, the offer comes straight to you — and the first driver to accept gets it.
          </p>
          <div className="mt-6"><FleetOfferPreview /></div>
        </div>
        <div className="lg:pt-10"><FleetControlPoints /></div>
      </section>

      {/* Proof: the owner's own screenshots of real fleet runs. */}
      <section className="mt-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Real loads from our fleet</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Not a mock-up. Here&apos;s an actual run.</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Straight from a fleet driver&apos;s phone: the assignment the night before, the delivery record with what Curri
          paid, and another multi-stop run.
        </p>
        <div className="mt-8"><FleetRealLoads /></div>
      </section>

      {/* No surprises after checkout. */}
      <section className="mt-20 grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">After you join</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">From joining to your first Friday payout</h2>
          <div className="mt-6"><FleetJoinTimeline /></div>
        </div>
        <div className="card p-6 sm:p-7 lg:mt-14">
          <FleetCapNote />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            <strong className="font-semibold text-foreground">Make it back or get it back.</strong>{" "}
            {FLEET.refundShort}
          </p>
          <a href="#join" className="btn-primary mt-5 flex w-full justify-center rounded-full px-6 py-3 text-base">
            Join the fleet — ${FLEET.price}
          </a>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Questions drivers ask before joining</h2>
        <div className="mt-8"><FleetFaq /></div>
        <div className="mt-8 text-center">
          <a href="#join" className="btn-primary inline-flex rounded-full px-8 py-3.5 text-base">
            Join the fleet — ${FLEET.price}
          </a>
        </div>
      </section>
    </div>
  );
}
