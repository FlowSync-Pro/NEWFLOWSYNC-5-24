"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BUMPS, CORE_OFFER, PLATFORM_FEE_PERCENT } from "@/lib/pricing";
import { SERVICES } from "@/lib/services";

function Check({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const fieldCls =
  "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent";

export default function OfferCheckout() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState({ firstName: "", lastName: "", email: "", primaryService: "" });

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const setField = (key: keyof typeof details, value: string) =>
    setDetails((d) => ({ ...d, [key]: value }));

  async function handleCheckout() {
    setError(null);
    setLoading(true);
    try {
      const bumps = BUMPS.filter((b) => selected[b.id]).map((b) => b.id);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bumps, ...details }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // hosted Stripe Checkout
        return;
      }
      // Stripe not configured yet — show the demo confirmation.
      setDone(true);
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const { total, lineItems } = useMemo(() => {
    const items: { label: string; price: number }[] = [
      { label: CORE_OFFER.name, price: CORE_OFFER.price },
    ];
    for (const b of BUMPS) {
      if (selected[b.id]) items.push({ label: b.name, price: b.price });
    }
    return { total: items.reduce((sum, i) => sum + i.price, 0), lineItems: items };
  }, [selected]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          One-time setup — no monthly fees
        </span>
        <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          Get listed. Get booked. <span className="text-accent">Keep 95%.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          A single ${CORE_OFFER.price} setup gets you in the directory and taking direct
          bookings. We only take {PLATFORM_FEE_PERCENT}% — you set the price and keep the rest.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        {/* Left: offer + bumps */}
        <div className="space-y-6">
          {/* Core offer */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-surface-2 px-7 py-5">
              <div>
                <h2 className="text-lg font-semibold">{CORE_OFFER.name}</h2>
                <p className="text-sm text-muted">{CORE_OFFER.tagline}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-accent">${CORE_OFFER.price}</p>
                <p className="text-xs text-muted">{CORE_OFFER.cadence}</p>
              </div>
            </div>
            <ul className="grid gap-3 px-7 py-6 sm:grid-cols-2">
              {CORE_OFFER.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm">
                  <span className="mt-0.5 text-accent">
                    <Check />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </section>

          {/* Bumps */}
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
              Power up your launch
            </p>
            <div className="space-y-4">
              {BUMPS.map((b) => {
                const on = !!selected[b.id];
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggle(b.id)}
                    className={`block w-full rounded-2xl border p-5 text-left transition-colors ${
                      on ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          on ? "border-accent bg-accent text-[#04130a]" : "border-border text-transparent"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            Add: {b.name}
                          </span>
                          {b.badge && (
                            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                              {b.badge}
                            </span>
                          )}
                          <span className="ml-auto text-lg font-bold text-accent">+${b.price}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted">{b.description}</p>
                        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {b.features.map((f) => (
                            <li key={f} className="flex gap-2 text-xs text-muted">
                              <span className="mt-0.5 text-accent">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: order summary */}
        <aside className="lg:sticky lg:top-24">
          <div className="card p-7">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="mt-5 space-y-3">
              {lineItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{item.label}</span>
                  <span className="font-medium">${item.price}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <span className="font-semibold">Total due today</span>
              <span className="text-2xl font-bold text-accent">${total}</span>
            </div>

            {done ? (
              <div className="mt-6 rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm">
                <p className="font-semibold text-accent">You&apos;re all set (demo).</p>
                <p className="mt-1 text-muted">
                  In the live version, this is where secure Stripe checkout runs, then we email
                  you a verification link and temporary password.
                </p>
                <Link href="/signup" className="btn-ghost mt-4 inline-flex rounded-full px-5 py-2.5 text-sm">
                  Build your profile
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-6 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <input className={fieldCls} placeholder="First name" value={details.firstName} onChange={(e) => setField("firstName", e.target.value)} />
                    <input className={fieldCls} placeholder="Last name" value={details.lastName} onChange={(e) => setField("lastName", e.target.value)} />
                  </div>
                  <input className={fieldCls} type="email" placeholder="Email" value={details.email} onChange={(e) => setField("email", e.target.value)} />
                  <select className={fieldCls} value={details.primaryService} onChange={(e) => setField("primaryService", e.target.value)}>
                    <option value="">Main service…</option>
                    {SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loading}
                  className="btn-primary mt-3 w-full rounded-full px-6 py-3.5 text-base disabled:opacity-60"
                >
                  {loading ? "Starting checkout…" : `Complete checkout — $${total}`}
                </button>
              </>
            )}

            <div className="mt-5 space-y-2 text-xs text-muted">
              <p className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-accent" /> 100% money-back if you&apos;re not listed
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-accent" /> Only {PLATFORM_FEE_PERCENT}% per job — no monthly fees
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-accent" /> Cancel your listing anytime
              </p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            Mockup — no payment is processed and no card is charged.
          </p>
        </aside>
      </div>
    </div>
  );
}
