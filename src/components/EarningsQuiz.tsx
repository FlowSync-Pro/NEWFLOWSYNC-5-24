"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { EARNINGS_CONSENT_TEXT, EARNINGS_SOURCE, VEHICLES, type Vehicle, type VehicleId } from "@/lib/earnings";
import { emailEarningsBreakdown } from "@/app/actions/leads";
import { FLEET, GUARANTEE_DAYS, listingPrice } from "@/lib/pricing";

// Owner-approved copy (2026-10-02). Numbers are BIDS we placed, never earnings —
// keep every sentence that says so, and the disclaimer, on every result.

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function FleetResult({ v }: { v: Vehicle }) {
  const r = v.range;
  return (
    <>
      {r ? (
        <>
          <p className="text-lg">
            <strong>{`${v.label}:`}</strong>
            {" most of our recent bids were "}
            <strong className="text-accent">{`${usd(r.typicalLow)}–${usd(r.typicalHigh)} per load`}</strong>
            {` (median ${usd(r.median)}). The full range ran from ${usd(r.min)}${r.minNote ? ` for ${r.minNote}` : ""} ` +
              `to ${usd(r.max)}${r.maxNote ? ` for ${r.maxNote}` : ""}.`}
          </p>
          <p className="mt-3 text-sm text-muted">
            {`These are bids we placed from the ${EARNINGS_SOURCE.account} on ${EARNINGS_SOURCE.dates} (${r.bids} ${v.label} bids). ` +
              `Not every bid wins, and a bid isn't a payout. Fleet drivers are paid the load rate minus the ` +
              `${FLEET.dispatchFeePercent}% dispatching fee, and cover their own fuel, insurance and wear.`}
          </p>
        </>
      ) : (
        <p className="text-lg">
          {`We haven't bid enough ${v.label.toLowerCase()} loads recently to show a fair range, so we're not going to ` +
            `guess. ${v.label}s can run Curri loads through our fleet.`}
        </p>
      )}
      <Link href="/#curri-fleet" className="btn-primary mt-5 inline-block rounded-full px-6 py-3 text-sm font-semibold">
        See how the Curri fleet works →
      </Link>
    </>
  );
}

function ListingResult() {
  return (
    <>
      <p className="text-lg">
        {`Curri loads are for pickups, vans and trucks, so we don't have car numbers to show. With a car, your strongest ` +
          `path is your own direct customers. A Verified listing puts you in our directory, where customers book you ` +
          `directly: ${usd(listingPrice())} one-time, with a ${GUARANTEE_DAYS}-day money-back guarantee.`}
      </p>
      <Link href="/pricing" className="btn-primary mt-5 inline-block rounded-full px-6 py-3 text-sm font-semibold">
        Get listed →
      </Link>
    </>
  );
}

/**
 * Optional "email me this" box under a result. The result never depends on it.
 * On a brand-new signup the server returns an id and we fire Meta's Lead event
 * once (owner-approved 2026-10-02). No email or other personal data goes to Meta.
 */
function EmailBreakdown({ vehicle }: { vehicle: VehicleId }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — hidden from people
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; message?: string }>({ status: "idle" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ status: "sending" });
    const r = await emailEarningsBreakdown({ email, vehicle, website });
    if (!r.ok) return setState({ status: "error", message: r.error });
    if (r.leadEventId) {
      const w = window as unknown as { fbq?: (...a: unknown[]) => void };
      w.fbq?.("track", "Lead", { content_name: "earnings-quiz" }, { eventID: r.leadEventId });
    }
    setState({ status: "done", message: r.message });
  }

  if (state.status === "done") {
    return <p className="mt-6 border-t border-border pt-5 text-sm text-accent">{state.message}</p>;
  }
  return (
    <form onSubmit={submit} className="mt-6 border-t border-border pt-5">
      <label htmlFor="breakdown-email" className="text-sm font-medium">Want this in your inbox?</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="breakdown-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          disabled={state.status === "sending"}
          className="btn-ghost shrink-0 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {state.status === "sending" ? "Sending…" : "Email me this breakdown"}
        </button>
      </div>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
      <p className="mt-2 text-xs text-muted">
        {`${EARNINGS_CONSENT_TEXT} `}
        <Link href="/privacy" className="underline hover:text-foreground">Privacy policy</Link>
      </p>
      {state.status === "error" && <p className="mt-2 text-sm text-red-300">{state.message}</p>}
    </form>
  );
}

export default function EarningsQuiz() {
  const [picked, setPicked] = useState<VehicleId | null>(null);
  const vehicle = VEHICLES.find((v) => v.id === picked) ?? null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Free tool for drivers
        </span>
        <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          What are loads going for with <span className="text-accent">your vehicle?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Pick your vehicle and see the bids we recently placed on real Curri loads, before expenses. It&apos;s a
          snapshot, not a promise.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label="Your vehicle">
        {VEHICLES.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={picked === v.id}
            onClick={() => setPicked(v.id)}
            className={`rounded-xl border px-4 py-4 text-sm font-medium transition-colors ${
              picked === v.id ? "border-accent bg-accent-soft text-foreground" : "border-border bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vehicle && (
        <div className="card mt-8 p-6" aria-live="polite">
          {vehicle.track === "fleet" ? <FleetResult v={vehicle} /> : <ListingResult />}
          <EmailBreakdown key={vehicle.id} vehicle={vehicle.id} />
        </div>
      )}

      <p className="mt-8 text-xs leading-relaxed text-muted">
        These numbers are bids we placed on real loads over two days. They are not typical or guaranteed earnings, and
        not what any driver was paid. What you make depends on your market, the hours you drive, the loads you accept
        and win, and your costs. FlowSync does not promise any income. FlowSync and Barham Transport LLC are independent
        and not affiliated with Curri.
      </p>
    </div>
  );
}
