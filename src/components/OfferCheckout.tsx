"use client";

import { useMemo, useState } from "react";
import { BUMPS, PLATFORM_FEE_PERCENT, TIERS } from "@/lib/pricing";

function Check({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function OfferCheckout() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tier = TIERS.standard;
  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  async function handleCheckout() {
    setError(null);
    setLoading(true);
    try {
      const bumps = BUMPS.filter((b) => selected[b.id]).map((b) => b.id);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier: "standard", bumps }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Checkout is temporarily unavailable. Please try again in a moment.");
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const { total, lineItems } = useMemo(() => {
    const items: { label: string; price: number }[] = [{ label: `${tier.name} listing`, price: tier.price }];
    for (const b of BUMPS) if (selected[b.id]) items.push({ label: b.name, price: b.price });
    return { total: items.reduce((s, i) => s + i.price, 0), lineItems: items };
  }, [selected, tier]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          One-time setup — no monthly fees
        </span>
        <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          Get listed. Get booked. <span className="text-accent">Keep 95%.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Get in the directory and start taking direct bookings. We only take{" "}
          {PLATFORM_FEE_PERCENT}% — you set the price and keep the rest.
        </p>
      </div>

      {/* Standard offer */}
      <div className="mx-auto mt-10 max-w-2xl">
        <div className="rounded-2xl border border-accent bg-accent-soft p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-lg font-bold">{tier.name} listing</span>
              <p className="mt-1 text-sm text-muted">{tier.tagline}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-3xl font-extrabold text-accent">${tier.price}</span>
              <span className="block text-xs text-muted">one-time</span>
            </div>
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {tier.features.map((f) => (
              <li key={f} className="flex gap-2 text-sm">
                <span className="mt-0.5 text-accent"><Check className="h-4 w-4" /></span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Want a custom service menu, a premium badge &amp; priority placement? Upgrade to{" "}
          <span className="font-medium text-foreground">Premium (${TIERS.premium.price})</span>{" "}
          anytime from your account after you&apos;re set up.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        {/* Bumps */}
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Power up your launch</p>
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
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${on ? "border-accent bg-accent text-[#04130a]" : "border-border text-transparent"}`}>
                      <Check className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">Add: {b.name}</span>
                        {b.badge && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">{b.badge}</span>}
                        <span className="ml-auto text-lg font-bold text-accent">+${b.price}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{b.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Order summary */}
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

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            <button type="button" onClick={handleCheckout} disabled={loading} className="btn-primary mt-6 w-full rounded-full px-6 py-3.5 text-base disabled:opacity-60">
              {loading ? "Starting checkout…" : `Continue to secure checkout — $${total}`}
            </button>
            <p className="mt-2 text-center text-xs text-muted">You&apos;ll set up your name and service right after payment.</p>

            <div className="mt-5 space-y-2 text-xs text-muted">
              <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" /> Only {PLATFORM_FEE_PERCENT}% per job — no monthly fees</p>
              <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" /> Cancel your listing anytime</p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted">Secure checkout powered by Stripe.</p>
        </aside>
      </div>
    </div>
  );
}
