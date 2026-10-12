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
} from "@/components/FleetDispatchExplainer";
import { FLEET, FLEET_SMALL } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

// The $197 small-vehicle fleet page (owner decision 2026-10-12): the same page
// and the same fleet as /curri-fleet, at FLEET_SMALL.price for the vehicles in
// FLEET_SMALL.vehicles. It exists for one Meta ad set, so it is kept out of
// search (noindex), the sitemap and the site's links — the ad link is the only
// way in. No structured data: it isn't meant to be found by search.

const title = "Curri Fleet for Cars, SUVs, Minivans, Cargo Vans & Pickups";
const description =
  "Drive a car, SUV, minivan, cargo van or pickup? Run Curri loads on Barham Transport's carrier account — offers on your phone with your pay shown up front, we bid the loads, paid every Friday.";
const vehicleList = "sedans, SUVs, minivans, cargo vans and pickup trucks";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}${FLEET_SMALL.path}` },
  openGraph: {
    type: "website",
    siteName: "FlowSync",
    title,
    description,
    url: `${SITE_URL}${FLEET_SMALL.path}`,
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function CurriFleetSmallVehiclesPage() {
  const price = FLEET_SMALL.price;
  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:pt-12">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">
        Curri fleet · for cars, SUVs, minivans, cargo vans &amp; pickups
      </p>
      <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
        Drive a car, SUV, minivan, cargo van or pickup? Get loads dispatched to you.
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
              <span className="text-3xl font-extrabold text-accent">${price}</span>
              <span className="ml-1 text-xs text-muted">one-time</span>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            This price is for {vehicleList}. Box truck, Sprinter or pickup + trailer?{" "}
            <Link href="/curri-fleet" className="font-medium text-accent underline-offset-4 hover:underline">
              Join at ${FLEET.price} here
            </Link>
            . I confirm your vehicle when I activate you.
          </p>
          <div className="mt-5">
            <FleetCheckout mode="standalone" smallVehicles />
          </div>
          <div className="mt-3">
            <FleetPayLaterNote />
          </div>
          <div className="mt-5">
            <FleetCapNote />
          </div>
          <div className="mt-4">
            <FleetTerms standalone price={price} />
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            Already a FlowSync driver? Use the same email you signed up with.
          </p>
          <div className="mt-5 border-t border-border pt-4">
            <FleetDisclaimer />
          </div>
        </div>

        <div className="order-2 lg:order-1">
          <h2 className="text-lg font-bold">How it works</h2>
          <p className="mt-3 text-muted">
            You get on our account instead of waiting on your own approval, we bid the loads, you run
            the ones you want, and you&apos;re paid every Friday as an independent contractor. Offers
            match your vehicle, so you&apos;re only sent loads it can carry.
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
          <div className="mt-6"><FleetJoinTimeline price={price} /></div>
        </div>
        <div className="card p-6 sm:p-7 lg:mt-14">
          <FleetCapNote />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            <strong className="font-semibold text-foreground">Make it back or get it back.</strong>{" "}
            {FLEET.refundShort}
          </p>
          <a href="#join" className="btn-primary mt-5 flex w-full justify-center rounded-full px-6 py-3 text-base">
            Join the fleet — ${price}
          </a>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Questions drivers ask before joining</h2>
        <div className="mt-8"><FleetFaq price={price} smallVehicles /></div>
        <div className="mt-8 text-center">
          <a href="#join" className="btn-primary inline-flex rounded-full px-8 py-3.5 text-base">
            Join the fleet — ${price}
          </a>
        </div>
      </section>
    </div>
  );
}
