"use client";

import { useMemo, useState } from "react";
import { FLEET } from "@/lib/pricing";

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

const money = (n: number) => `$${Math.max(0, n).toFixed(0)}`;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/**
 * Load bidding calculator (Premium). Answers three questions before you bid:
 * what this load costs you to run, what you need to make it worth your hour,
 * and what to bid. Estimates only — the driver enters their own numbers.
 */
export default function BiddingCalculator() {
  const [listed, setListed] = useState(100);
  const [loadedMiles, setLoadedMiles] = useState(40);
  const [deadheadMiles, setDeadheadMiles] = useState(15);
  const [costPerMile, setCostPerMile] = useState(0.65);
  const [hours, setHours] = useState(2);
  const [targetHourly, setTargetHourly] = useState(35);
  const [onFleet, setOnFleet] = useState(true);

  const r = useMemo(() => {
    const miles = loadedMiles + deadheadMiles;
    const vehicleCost = miles * costPerMile;
    const timeValue = hours * targetHourly;
    const breakEven = vehicleCost; // covers the vehicle; your time is not yet paid
    const worthIt = vehicleCost + timeValue; // covers the vehicle and pays your hour
    const feePct = onFleet ? FLEET.dispatchFeePercent / 100 : 0;
    // A bid nets you (bid × (1 − fee)); solve for the bid that nets "worthIt".
    const bidToClear = worthIt / (1 - feePct);
    const suggested = Math.max(bidToClear, listed);
    const roundedBid = Math.ceil(suggested / 5) * 5;
    const netAt = (bid: number) => bid * (1 - feePct) - vehicleCost;
    return {
      miles,
      vehicleCost,
      breakEven,
      worthIt,
      roundedBid,
      netListed: netAt(listed),
      netBid: netAt(roundedBid),
      netDouble: netAt(listed * 2),
      perMileListed: miles > 0 ? (listed * (1 - feePct)) / miles : 0,
      perMileBid: miles > 0 ? (roundedBid * (1 - feePct)) / miles : 0,
    };
  }, [listed, loadedMiles, deadheadMiles, costPerMile, hours, targetHourly, onFleet]);

  const num = (set: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(Number(e.target.value) || 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="card space-y-4 p-6">
        <Field label="Listed price" hint="what the app is offering">
          <input type="number" min={0} value={listed} onChange={num(setListed)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loaded miles">
            <input type="number" min={0} value={loadedMiles} onChange={num(setLoadedMiles)} className={inputCls} />
          </Field>
          <Field label="Deadhead miles" hint="to pickup + back">
            <input type="number" min={0} value={deadheadMiles} onChange={num(setDeadheadMiles)} className={inputCls} />
          </Field>
        </div>
        <Field label="Your cost per mile" hint="fuel, maintenance, tires, insurance — from your P&L">
          <input type="number" min={0} step={0.05} value={costPerMile} onChange={num(setCostPerMile)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours this load takes" hint="door to door">
            <input type="number" min={0} step={0.25} value={hours} onChange={num(setHours)} className={inputCls} />
          </Field>
          <Field label="Your hourly target">
            <input type="number" min={0} value={targetHourly} onChange={num(setTargetHourly)} className={inputCls} />
          </Field>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <input type="checkbox" checked={onFleet} onChange={(e) => setOnFleet(e.target.checked)} />
          Running under the fleet ({FLEET.dispatchFeePercent}% dispatching fee comes out of the bid)
        </label>
      </div>

      <div className="space-y-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest text-muted">Break-even (vehicle only)</p>
          <p className="mt-1 text-2xl font-bold">{money(r.breakEven)}</p>
          <p className="text-xs text-muted">{r.miles} total miles × ${costPerMile.toFixed(2)}. Below this you&apos;re paying to work.</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest text-muted">Worth your time</p>
          <p className="mt-1 text-2xl font-bold">{money(r.worthIt)}</p>
          <p className="text-xs text-muted">Vehicle cost plus {hours} h at ${targetHourly}/h. The least you should net.</p>
        </div>
        <div className="rounded-2xl border border-accent bg-accent-soft p-5">
          <p className="text-xs uppercase tracking-widest text-accent">Bid this</p>
          <p className="mt-1 text-4xl font-extrabold text-accent">{money(r.roundedBid)}</p>
          <p className="mt-1 text-sm text-foreground/90">
            Nets you about <strong>{money(r.netBid)}</strong> after vehicle cost{onFleet ? " and the dispatch fee" : ""} — ${r.perMileBid.toFixed(2)} per mile.
          </p>
        </div>
        <div className="card p-5 text-sm">
          <p className="font-semibold">For comparison</p>
          <div className="mt-2 space-y-1 text-muted">
            <p>Take the listed {money(listed)}: net <span className={r.netListed < 0 ? "text-red-400" : "text-foreground"}>{money(r.netListed)}</span> · ${r.perMileListed.toFixed(2)}/mile</p>
            <p>Bid 2× listed ({money(listed * 2)}): net <span className="text-foreground">{money(r.netDouble)}</span></p>
          </div>
          <p className="mt-3 text-xs text-muted">
            Estimates from the numbers you enter. Bids don&apos;t always win — that&apos;s the point of knowing your floor before you click.
          </p>
        </div>
      </div>
    </div>
  );
}
