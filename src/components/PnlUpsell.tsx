"use client";

import { useState } from "react";
import { PNL_PRO } from "@/lib/pricing";

// Post-purchase / account upsell for P&L Tracker Pro. Shown to signed-in drivers who
// aren't subscribed yet. Starts a Stripe subscription Checkout (first month free).
export default function PnlUpsell() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "pnl-subscribe" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Payments aren't enabled yet — try again shortly.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card relative overflow-hidden p-6 sm:p-7">
      <div className="glow-radial pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight">{PNL_PRO.name}</h2>
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-[#04130a]">
            First month free
          </span>
        </div>
        <p className="mt-1.5 text-muted">{PNL_PRO.tagline}</p>

        <ul className="mt-4 space-y-2">
          {PNL_PRO.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 text-accent">✓</span>
              <span className="text-foreground/90">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            onClick={start}
            disabled={loading}
            className="btn-primary rounded-xl px-6 py-3 text-sm disabled:opacity-60"
          >
            {loading ? "Starting…" : "Start my free month"}
          </button>
          <p className="text-xs text-muted">
            Then ${PNL_PRO.price}/mo. Card required · cancel anytime.
          </p>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </section>
  );
}
