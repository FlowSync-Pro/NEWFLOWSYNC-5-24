"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addTrip, deleteTrip, addInspection } from "@/app/actions/trips";
import { fileToScaledDataUrl } from "@/lib/image";
import { INSPECTION_ITEMS, money, sumTrips, tripStats, type TripView } from "@/lib/trips";
import TripMap from "./TripMap";

export interface InspectionView {
  id: string;
  date: string;
  passed: boolean;
  odometer: number | null;
  notes: string | null;
}

const field = "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent";
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s: string) => new Date(s).toLocaleDateString();

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className={`text-xl font-bold ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

export default function TripsManager({ trips, inspections }: { trips: TripView[]; inspections: InspectionView[] }) {
  const router = useRouter();
  const totals = sumTrips(trips);
  const totalMiles = totals.paidMiles + totals.deadheadMiles;
  const deadheadPct = totalMiles > 0 ? (totals.deadheadMiles / totalMiles) * 100 : 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Operations</h1>
      <p className="mt-1 text-muted">Log every trip, track miles and expenses, and see your real profit.</p>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Trips" value={String(trips.length)} />
        <Stat label="Total miles" value={totalMiles.toFixed(1)} />
        <Stat label="Deadhead" value={`${Math.round(deadheadPct)}%`} />
        <Stat label="Earnings" value={money(totals.earningsCents)} accent />
        <Stat label="Expenses" value={money(totals.expensesCents)} />
        <Stat label="Net profit" value={money(totals.profitCents)} accent />
      </div>

      <InspectionSection inspections={inspections} onDone={() => router.refresh()} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.25fr] lg:items-start">
        <TripForm onDone={() => router.refresh()} />
        <TripList trips={trips} onDone={() => router.refresh()} />
      </div>
    </div>
  );
}

function InspectionSection({ inspections, onDone }: { inspections: InspectionView[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Record<string, boolean>>(() => Object.fromEntries(INSPECTION_ITEMS.map((i) => [i.id, true])));
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    await addInspection({ items, odometer: odometer ? Number(odometer) : undefined, notes });
    setBusy(false);
    setOpen(false);
    setItems(Object.fromEntries(INSPECTION_ITEMS.map((i) => [i.id, true])));
    setOdometer(""); setNotes("");
    onDone();
  };

  return (
    <section className="card mt-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pre-trip inspection</h2>
          <p className="text-sm text-muted">{inspections.length ? `Last: ${fmtDate(inspections[0].date)} · ${inspections[0].passed ? "Passed" : "Issues noted"}` : "Start your day with a quick safety check."}</p>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="btn-ghost rounded-full px-5 py-2.5 text-sm">{open ? "Cancel" : "Start inspection"}</button>
      </div>

      {open && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {INSPECTION_ITEMS.map((it) => (
              <label key={it.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm">
                <input type="checkbox" checked={items[it.id]} onChange={(e) => setItems((s) => ({ ...s, [it.id]: e.target.checked }))} className="h-4 w-4 accent-[#25e07a]" />
                {it.label}
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={field} type="number" placeholder="Odometer (optional)" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
            <input className={field} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button onClick={submit} disabled={busy} className="btn-primary rounded-full px-6 py-2.5 text-sm disabled:opacity-60">{busy ? "Saving…" : "Log inspection"}</button>
        </div>
      )}
    </section>
  );
}

function TripForm({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ date: todayStr(), pickupAddress: "", dropoffAddress: "", earnings: "", paidMiles: "", deadheadMiles: "", fuel: "", tolls: "", otherExpenses: "", durationMinutes: "", notes: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const u = await fileToScaledDataUrl(file, 900);
      if (u) urls.push(u);
    }
    setPhotos((p) => [...p, ...urls].slice(0, 6));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await addTrip({
      date: f.date, pickupAddress: f.pickupAddress, dropoffAddress: f.dropoffAddress,
      earnings: Number(f.earnings), paidMiles: Number(f.paidMiles), deadheadMiles: Number(f.deadheadMiles),
      fuel: Number(f.fuel), tolls: Number(f.tolls), otherExpenses: Number(f.otherExpenses),
      durationMinutes: Number(f.durationMinutes), notes: f.notes, photos,
    });
    setBusy(false);
    if (res.ok) { setF({ date: todayStr(), pickupAddress: "", dropoffAddress: "", earnings: "", paidMiles: "", deadheadMiles: "", fuel: "", tolls: "", otherExpenses: "", durationMinutes: "", notes: "" }); setPhotos([]); onDone(); }
    else setError(res.error ?? "Couldn't save the trip.");
  };

  return (
    <form onSubmit={submit} className="card space-y-3 p-6 lg:sticky lg:top-24">
      <h2 className="text-lg font-semibold">Log a trip</h2>
      <input className={field} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
      <input className={field} placeholder="Pickup address" value={f.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} required />
      <input className={field} placeholder="Drop-off address" value={f.dropoffAddress} onChange={(e) => set("dropoffAddress", e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted">Earnings ($)<input className={field} type="number" step="0.01" value={f.earnings} onChange={(e) => set("earnings", e.target.value)} /></label>
        <label className="text-xs text-muted">Duration (min)<input className={field} type="number" value={f.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} /></label>
        <label className="text-xs text-muted">Paid miles<input className={field} type="number" step="0.1" value={f.paidMiles} onChange={(e) => set("paidMiles", e.target.value)} /></label>
        <label className="text-xs text-muted">Deadhead miles<input className={field} type="number" step="0.1" value={f.deadheadMiles} onChange={(e) => set("deadheadMiles", e.target.value)} /></label>
        <label className="text-xs text-muted">Fuel ($)<input className={field} type="number" step="0.01" value={f.fuel} onChange={(e) => set("fuel", e.target.value)} /></label>
        <label className="text-xs text-muted">Tolls ($)<input className={field} type="number" step="0.01" value={f.tolls} onChange={(e) => set("tolls", e.target.value)} /></label>
        <label className="col-span-2 text-xs text-muted">Other / personal expenses ($)<input className={field} type="number" step="0.01" value={f.otherExpenses} onChange={(e) => set("otherExpenses", e.target.value)} /></label>
      </div>
      <textarea className={`${field} resize-none`} rows={2} placeholder="Notes (optional)" value={f.notes} onChange={(e) => set("notes", e.target.value)} />

      <div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost w-full rounded-xl px-4 py-2.5 text-sm">Add delivery photos ({photos.length}/6)</button>
        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <span key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
                <button type="button" onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background text-muted">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full rounded-full px-5 py-3 text-sm disabled:opacity-60">{busy ? "Saving…" : "Save trip"}</button>
    </form>
  );
}

function TripList({ trips, onDone }: { trips: TripView[]; onDone: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async (id: string) => {
    setBusy(true); await deleteTrip(id); setBusy(false); onDone();
  };

  if (trips.length === 0) {
    return <div className="card p-8 text-center text-muted">No trips logged yet. Add your first one.</div>;
  }

  return (
    <div className="space-y-3">
      {trips.map((t) => {
        const s = tripStats(t);
        const expanded = open === t.id;
        return (
          <div key={t.id} className="card overflow-hidden">
            <button onClick={() => setOpen(expanded ? null : t.id)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.pickupAddress} → {t.dropoffAddress}</p>
                <p className="text-xs text-muted">{fmtDate(t.date)} · {s.totalMiles.toFixed(1)} mi ({t.deadheadMiles.toFixed(1)} deadhead)</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${s.profitCents >= 0 ? "text-accent" : "text-red-400"}`}>{money(s.profitCents)}</p>
                <p className="text-xs text-muted">net</p>
              </div>
            </button>
            {expanded && (
              <div className="space-y-4 border-t border-border p-5">
                <TripMap pickup={t.pickupAddress} dropoff={t.dropoffAddress} />
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><p className="text-xs text-muted">Earnings</p><p className="font-medium text-accent">{money(t.earningsCents)}</p></div>
                  <div><p className="text-xs text-muted">Fuel / tolls / other</p><p className="font-medium">{money(t.fuelCents + t.tollsCents + t.otherExpensesCents)}</p></div>
                  <div><p className="text-xs text-muted">Miles (paid + deadhead)</p><p className="font-medium">{t.paidMiles.toFixed(1)} + {t.deadheadMiles.toFixed(1)}</p></div>
                  <div><p className="text-xs text-muted">Profit / mile</p><p className="font-medium">{money(Math.round(s.profitPerMile))}</p></div>
                  <div><p className="text-xs text-muted">Duration</p><p className="font-medium">{Math.floor(t.durationMinutes / 60)}h {t.durationMinutes % 60}m</p></div>
                  <div><p className="text-xs text-muted">Deadhead</p><p className="font-medium">{Math.round(s.deadheadPct)}%</p></div>
                </div>
                {t.notes && <p className="text-sm text-muted">{t.notes}</p>}
                {t.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {t.photos.map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt="Delivery" className="h-20 w-20 rounded-lg border border-border object-cover" /></a>
                    ))}
                  </div>
                )}
                <button onClick={() => remove(t.id)} disabled={busy} className="text-xs text-muted hover:text-red-400">Delete trip</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
