"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SERVICES, type ServiceId } from "@/lib/services";
import { PLATFORM_FEE_PERCENT } from "@/lib/pricing";

// Sensible starting hourly suggestion per service (midpoint-ish of its range).
const SUGGESTED_HOURLY: Record<ServiceId, number> = {
  grocery: 28,
  food: 24,
  furniture: 47,
  courier: 26,
  pharmacy: 31,
  senior: 29,
  moving: 57,
  "auto-parts": 26,
};

const money = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

export default function QuoteCalculator({ alreadyListed = false }: { alreadyListed?: boolean } = {}) {
  const [service, setService] = useState<ServiceId | "">("");
  const [distance, setDistance] = useState(10);
  const [roundTrip, setRoundTrip] = useState(true);
  const [timeMinutes, setTimeMinutes] = useState(60);
  const [hourly, setHourly] = useState(28);
  const [costPerMile, setCostPerMile] = useState(0.3);
  const [extras, setExtras] = useState(0);
  const [commission, setCommission] = useState(30);
  const [jobsPerWeek, setJobsPerWeek] = useState(10);

  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v) || 0));

  const pickService = (id: ServiceId | "") => {
    setService(id);
    if (id) setHourly(SUGGESTED_HOURLY[id]);
  };

  const r = useMemo(() => {
    const hours = timeMinutes / 60;
    const miles = roundTrip ? distance * 2 : distance;
    const labor = hourly * hours;
    const mileage = costPerMile * miles;
    const quote = labor + mileage + extras;

    const flowsyncTake = quote * (1 - PLATFORM_FEE_PERCENT / 100);
    const appTake = quote * (1 - commission / 100);
    const perJobDiff = flowsyncTake - appTake;
    const monthlyDiff = perJobDiff * jobsPerWeek * 4.33;

    return { hours, miles, labor, mileage, quote, flowsyncTake, appTake, perJobDiff, monthlyDiff };
  }, [timeMinutes, roundTrip, distance, hourly, costPerMile, extras, commission, jobsPerWeek]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Free tool for FlowSync drivers
        </span>
        <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          Quote fairly. <span className="text-accent">Get paid right.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Price every job so it covers your costs and pays you well — then see how much more you
          take home on FlowSync versus a typical gig app.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        {/* Inputs */}
        <section className="card space-y-5 p-7">
          <h2 className="text-lg font-semibold">Job details</h2>

          <Field label="Service type" hint="Optional — sets a suggested hourly rate.">
            <select
              value={service}
              onChange={(e) => pickService(e.target.value as ServiceId | "")}
              className={inputCls}
            >
              <option value="">Choose a service…</option>
              {SERVICES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Distance (miles)">
              <input
                type="number"
                value={distance}
                min={0}
                onChange={(e) => setDistance(num(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Time on the job (minutes)">
              <input
                type="number"
                value={timeMinutes}
                min={0}
                onChange={(e) => setTimeMinutes(num(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
            <input
              type="checkbox"
              checked={roundTrip}
              onChange={(e) => setRoundTrip(e.target.checked)}
              className="h-4 w-4 accent-[#25e07a]"
            />
            <span className="text-sm">Round trip (I return without a paying load)</span>
          </label>

          <Field label={`Your target hourly rate: ${money(hourly)}/hr`}>
            <input
              type="range"
              min={15}
              max={90}
              step={1}
              value={hourly}
              onChange={(e) => setHourly(Number(e.target.value))}
              className="w-full accent-[#25e07a]"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Vehicle cost per mile ($)" hint="Gas + wear & tear. IRS-style ≈ $0.30–0.67.">
              <input
                type="number"
                step={0.05}
                value={costPerMile}
                min={0}
                onChange={(e) => setCostPerMile(num(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Extra costs ($)" hint="Tolls, parking, supplies, a helper.">
              <input
                type="number"
                value={extras}
                min={0}
                onChange={(e) => setExtras(num(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {/* Results */}
        <aside className="space-y-6 lg:sticky lg:top-24">
          <div className="card overflow-hidden">
            <div className="border-b border-border bg-accent-soft px-7 py-6 text-center">
              <p className="text-sm text-muted">Suggested quote to request</p>
              <p className="mt-1 text-5xl font-extrabold text-accent">{money(r.quote)}</p>
            </div>
            <div className="space-y-3 px-7 py-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Your time ({r.hours.toFixed(1)} hr × {money(hourly)})</span>
                <span className="font-medium">{money(r.labor)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Mileage ({Math.round(r.miles)} mi × ${costPerMile.toFixed(2)})</span>
                <span className="font-medium">{money(r.mileage)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Extra costs</span>
                <span className="font-medium">{money(extras)}</span>
              </div>
            </div>
          </div>

          {/* Take-home comparison */}
          <div className="card p-7">
            <h2 className="text-base font-semibold">What you actually take home</h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-accent/40 bg-accent-soft p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">On FlowSync (−{PLATFORM_FEE_PERCENT}%)</span>
                  <span className="text-xl font-bold text-accent">{money(r.flowsyncTake)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Typical gig app (−{commission}%)</span>
                  <span className="text-xl font-bold text-muted">{money(r.appTake)}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={1}
                  value={commission}
                  onChange={(e) => setCommission(Number(e.target.value))}
                  className="mt-3 w-full accent-[#25e07a]"
                  aria-label="Typical app commission percent"
                />
                <p className="mt-1 text-xs text-muted">Drag to match an app you&apos;ve used (10–50%).</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-surface-2 p-4 text-center">
              <p className="text-sm text-muted">You keep</p>
              <p className="text-2xl font-extrabold text-accent">{money(r.perJobDiff)} more</p>
              <p className="text-xs text-muted">per job, before doing anything differently</p>
            </div>
          </div>

          {/* Projection */}
          <div className="card p-7">
            <Field label={`If you do ${jobsPerWeek} jobs / week`}>
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={jobsPerWeek}
                onChange={(e) => setJobsPerWeek(Number(e.target.value))}
                className="w-full accent-[#25e07a]"
              />
            </Field>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-accent/40 bg-accent-soft px-4 py-4">
              <span className="text-sm font-medium">Extra take-home / month</span>
              <span className="text-2xl font-extrabold text-accent">{money(r.monthlyDiff)}</span>
            </div>
            {!alreadyListed && (
              <Link href="/pricing" className="btn-primary mt-5 flex w-full justify-center rounded-full px-6 py-3 text-sm">
                Get listed for $17
              </Link>
            )}
          </div>
        </aside>
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Estimates for planning only. You always set your own price — this is a guide to quote fairly.
      </p>
    </div>
  );
}
