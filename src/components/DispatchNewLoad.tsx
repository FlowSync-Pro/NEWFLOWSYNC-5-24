"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDispatchLoad } from "@/app/actions/dispatch";

const VEHICLES = [
  ["CAR", "Car"], ["SUV", "SUV"], ["MINIVAN", "Minivan"], ["PICKUP_TRUCK", "Pickup truck"],
  ["CARGO_VAN", "Cargo van"], ["SPRINTER_VAN", "Sprinter van"], ["BOX_TRUCK", "Box truck"],
] as const;

const localNow = () => {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/** /admin/dispatch: type a Curri opportunity in (stage 2 ingests Curri's emails instead). */
export default function DispatchNewLoad() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ curriRef: "", lane: "CLAIM" as "CLAIM" | "BID", rush: false, pickupAt: localNow(), pickupAddress: "", pickupZip: "", dropoffAddress: "", dropoffZip: "", vehicleClass: "CARGO_VAN" as (typeof VEHICLES)[number][0], listed: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const input = "mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

  function submit() {
    setError(null);
    start(async () => {
      const r = await createDispatchLoad({ ...f, pickupAt: new Date(f.pickupAt).toISOString() });
      if (!r.ok) { setError(r.error); return; }
      router.push(`/admin/dispatch/${r.id}`);
    });
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="text-lg font-bold tracking-tight">New load</h2>
      <p className="mt-1 text-sm text-muted">Copy it from the Curri portal. ZIPs drive the distance ranking; addresses are for the driver.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted">Pickup address<input value={f.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} placeholder="1200 W Shaw Ave, Fresno, CA" className={input} /></label>
        <label className="text-xs text-muted">Pickup ZIP<input value={f.pickupZip} onChange={(e) => set("pickupZip", e.target.value.replace(/[^\d]/g, "").slice(0, 5))} inputMode="numeric" placeholder="93711" className={input} /></label>
        <label className="text-xs text-muted">Dropoff address<input value={f.dropoffAddress} onChange={(e) => set("dropoffAddress", e.target.value)} placeholder="400 Clovis Ave, Clovis, CA" className={input} /></label>
        <label className="text-xs text-muted">Dropoff ZIP<input value={f.dropoffZip} onChange={(e) => set("dropoffZip", e.target.value.replace(/[^\d]/g, "").slice(0, 5))} inputMode="numeric" placeholder="93612" className={input} /></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
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
        <label className="text-xs text-muted">Curri reference<input value={f.curriRef} onChange={(e) => set("curriRef", e.target.value)} placeholder="#48213" className={input} /></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr_2fr] sm:items-end">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.rush} onChange={(e) => set("rush", e.target.checked)} /> Rush (pickup within 30 min)
        </label>
        <label className="text-xs text-muted">Scheduled pickup<input type="datetime-local" value={f.pickupAt} disabled={f.rush} onChange={(e) => set("pickupAt", e.target.value)} className={`${input} disabled:opacity-50`} /></label>
        <label className="text-xs text-muted">Notes for the driver<input value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="2 pallets, liftgate at dropoff" className={input} /></label>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <button type="button" onClick={submit} disabled={pending} className="btn-primary mt-4 rounded-full px-6 py-2.5 text-sm disabled:opacity-60">
        {pending ? "Ranking drivers…" : "Add load and rank drivers"}
      </button>
    </section>
  );
}
