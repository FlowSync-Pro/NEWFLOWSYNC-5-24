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
import { FLEET } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

const title = "Join the FlowSync Curri Fleet";
const description =
  "Barham Transport runs its own carrier account on Curri and dispatches nearby loads to fleet drivers. You get on our account instead of waiting on your own approval, we bid the loads, you run the ones you want, and you're paid every Friday as an independent contractor.";

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
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">
        Curri fleet · a separate opportunity
      </p>
      <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
        Want loads dispatched to you? Join our carrier fleet.
      </h1>
      <p className="mt-4 max-w-2xl text-muted">
        Barham Transport runs its own carrier account on Curri and dispatches nearby loads to fleet
        drivers.
      </p>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="card order-1 p-6 sm:p-7 lg:order-2">
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
    </div>
  );
}
