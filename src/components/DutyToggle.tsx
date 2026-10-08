"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { goOffDuty, goOnDuty } from "@/app/actions/duty";

/**
 * Fleet page: going on duty is the driver's commitment — within these
 * parameters the dispatcher may assign them a load and claim it in Curri on
 * their behalf (docs/DISPATCH-FLOW.md). Off duty = no loads, no questions.
 */
export default function DutyToggle({
  onDuty,
  onDutyUntil,
  radiusMiles,
  maxTripMiles,
  baseZip,
  vehicleLabel,
  defaults,
}: {
  /** Computed on the server (render must stay pure). */
  onDuty: boolean;
  onDutyUntil: string | null;
  radiusMiles: number | null;
  maxTripMiles: number | null;
  baseZip: string | null;
  vehicleLabel: string;
  defaults: { shiftHours: number; radiusMiles: number; maxTripMiles: number };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [hours, setHours] = useState(String(defaults.shiftHours));
  const [radius, setRadius] = useState(String(radiusMiles ?? defaults.radiusMiles));
  const [maxTrip, setMaxTrip] = useState(String(maxTripMiles ?? defaults.maxTripMiles));
  const [error, setError] = useState<string | null>(null);
  const ready = !!baseZip && vehicleLabel !== "—";

  function on() {
    setError(null);
    start(async () => {
      const r = await goOnDuty({ hours: Number(hours) || defaults.shiftHours, radiusMiles: Number(radius) || defaults.radiusMiles, maxTripMiles: Number(maxTrip) || defaults.maxTripMiles });
      if (!r.ok) { setError(r.error ?? "Couldn't update."); return; }
      router.refresh();
    });
  }
  function off() {
    setError(null);
    start(async () => {
      const r = await goOffDuty();
      if (!r.ok) { setError(r.error ?? "Couldn't update."); return; }
      router.refresh();
    });
  }

  const input = "mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

  return (
    <section className={`mt-6 rounded-2xl border p-6 ${onDuty ? "border-accent/40 bg-accent-soft" : "border-border bg-surface-2/40"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{onDuty ? "You're on duty" : "Go on duty"}</h2>
          <p className="mt-1 text-sm text-muted">
            {onDuty
              ? `Until ${new Date(onDutyUntil!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · within ${radiusMiles ?? defaults.radiusMiles} mi of ${baseZip} · trips up to ${maxTripMiles ?? defaults.maxTripMiles} mi · ${vehicleLabel}`
              : "On duty means: if a load fits what you set below, we may claim it for you and send you the details. Only go on duty when you'll actually run it — a claimed load can't be released."}
          </p>
        </div>
        {onDuty && (
          <button type="button" onClick={off} disabled={pending} className="rounded-full border border-border px-5 py-2.5 text-sm text-muted hover:text-foreground disabled:opacity-60">
            {pending ? "Saving…" : "Go off duty"}
          </button>
        )}
      </div>
      {!onDuty && (
        <>
          {!ready && (
            <p className="mt-3 text-sm text-red-300">
              First add your {!baseZip ? "home base ZIP" : ""}{!baseZip && vehicleLabel === "—" ? " and " : ""}{vehicleLabel === "—" ? "vehicle type" : ""} on{" "}
              <Link href="/account/edit" className="underline">Edit profile</Link>, so we know where you start and what you drive.
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted">Hours on duty<input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="numeric" className={input} /></label>
            <label className="text-xs text-muted">Radius from {baseZip || "your ZIP"} (miles)<input value={radius} onChange={(e) => setRadius(e.target.value)} inputMode="numeric" className={input} /></label>
            <label className="text-xs text-muted">Longest trip you&apos;ll take (miles)<input value={maxTrip} onChange={(e) => setMaxTrip(e.target.value)} inputMode="numeric" className={input} /></label>
          </div>
          <button type="button" onClick={on} disabled={pending || !ready} className="btn-primary mt-4 rounded-full px-6 py-2.5 text-sm disabled:opacity-60">
            {pending ? "Saving…" : "Go on duty"}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </section>
  );
}
