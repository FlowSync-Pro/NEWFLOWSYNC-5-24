"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDispatchLoad } from "@/app/actions/dispatch";
import { fromPtWallClock, ptWallClock } from "@/lib/pt-time";

const VEHICLES = [
  ["CAR", "Car"], ["SUV", "SUV"], ["MINIVAN", "Minivan"], ["PICKUP_TRUCK", "Pickup truck"],
  ["CARGO_VAN", "Cargo van"], ["SPRINTER_VAN", "Sprinter van"], ["BOX_TRUCK", "Box truck"],
] as const;

// An hour from now, in Pacific time — Curri's times are PT whatever zone the owner's phone is in.
const ptNow = () => ptWallClock(new Date(Date.now() + 60 * 60_000));

/** /admin/dispatch: type a Curri opportunity in (stage 2 ingests Curri's emails instead). */
export default function DispatchNewLoad() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ curriRef: "", lane: "CLAIM" as "CLAIM" | "BID", rush: false, pickupAt: ptNow(), pickupAddress: "", pickupZip: "", dropoffAddress: "", dropoffZip: "", vehicleClass: "CARGO_VAN" as (typeof VEHICLES)[number][0], listed: "", notes: "", miles: "", sendNow: true });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const input = "mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

  function submit() {
    setError(null);
    start(async () => {
      const r = await createDispatchLoad({ ...f, pickupAt: fromPtWallClock(f.pickupAt)?.toISOString() ?? "" });
      if (!r.ok) { setError(r.error); return; }
      router.push(`/admin/dispatch/${r.id}`);
    });
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="text-lg font-bold tracking-tight">New load</h2>
      <p className="mt-1 text-sm text-muted">Copy it from the Curri email or portal. A ZIP or a city (&quot;Fresno&quot; or &quot;Fresno, CA&quot;) drives the distance ranking; the address, when you have it, is for the driver.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted">Pickup ZIP or city<input value={f.pickupZip} onChange={(e) => set("pickupZip", e.target.value.slice(0, 60))} placeholder="93711 or Fresno, CA" className={input} /></label>
        <label className="text-xs text-muted">Pickup address (optional)<input value={f.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} placeholder="1200 W Shaw Ave, Fresno, CA" className={input} /></label>
        <label className="text-xs text-muted">Dropoff ZIP or city<input value={f.dropoffZip} onChange={(e) => set("dropoffZip", e.target.value.slice(0, 60))} placeholder="93612 or Clovis, CA" className={input} /></label>
        <label className="text-xs text-muted">Dropoff address (optional)<input value={f.dropoffAddress} onChange={(e) => set("dropoffAddress", e.target.value)} placeholder="400 Clovis Ave, Clovis, CA" className={input} /></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-5">
        <label className="text-xs text-muted">Vehicle needed
          <select value={f.vehicleClass} onChange={(e) => set("vehicleClass", e.target.value as typeof f.vehicleClass)} className={input}>
            {VEHICLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted">Lane
          <select value={f.lane} onChange={(e) => set("lane", e.target.value as typeof f.lane)} className={input}>
            <option value="CLAIM">Claim — listed price, goes fast</option>
            <option value="BID">Bid — taking bids</option>
          </select>
        </label>
        <label className="text-xs text-muted">Listed price ($)<input value={f.listed} onChange={(e) => set("listed", e.target.value)} inputMode="decimal" placeholder="145.00" className={input} /></label>
        <label className="text-xs text-muted">Curri miles<input value={f.miles} onChange={(e) => set("miles", e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="28" className={input} /></label>
        <label className="text-xs text-muted">Curri reference<input value={f.curriRef} onChange={(e) => set("curriRef", e.target.value)} placeholder="#48213" className={input} /></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr_2fr] sm:items-end">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.rush} onChange={(e) => set("rush", e.target.checked)} /> Rush (pickup within 30 min)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.sendNow} onChange={(e) => set("sendNow", e.target.checked)} /> Send to drivers now
          </label>
        </div>
        <label className="text-xs text-muted">Scheduled pickup (Pacific time)<input type="datetime-local" value={f.pickupAt} disabled={f.rush} onChange={(e) => set("pickupAt", e.target.value)} className={`${input} disabled:opacity-50`} /></label>
        <label className="text-xs text-muted">Notes for the driver<input value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="2 pallets, liftgate at dropoff" className={input} /></label>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <button type="button" onClick={submit} disabled={pending} className="btn-primary mt-4 rounded-full px-6 py-2.5 text-sm disabled:opacity-60">
        {pending ? "Working…" : f.sendNow ? "Add load and offer to Active drivers" : "Add load and rank drivers"}
      </button>
    </section>
  );
}
