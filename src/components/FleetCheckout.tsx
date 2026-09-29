"use client";

import { useState } from "react";
import { FLEET } from "@/lib/pricing";

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

/**
 * Starts a Curri fleet checkout at the full price.
 *  - mode="standalone": homepage / pricing-page visitor, no account. Collects
 *    name, email and phone (the owner onboards fleet drivers by text) and
 *    pays $297, which also creates their FlowSync account + listing.
 *  - mode="member": signed-in driver on the fleet guide. One button, $297.
 */
export default function FleetCheckout({ mode }: { mode: "standalone" | "member" }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let ref = "";
      try { ref = localStorage.getItem("fs_ref") || ""; } catch {}
      const payload =
        mode === "standalone"
          ? { intent: "fleet-standalone", firstName, lastName, email, phone, ref }
          : { intent: "fleet" };
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(
        data.configured === false
          ? "Payments are temporarily unavailable. Please try again later."
          : data.error ?? "Couldn't start checkout. Please try again.",
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const label = loading ? "Opening secure checkout…" : `Join the fleet — $${FLEET.price} one-time`;

  if (mode === "member") {
    return (
      <div>
        <button type="button" onClick={() => go()} disabled={loading} className="btn-primary w-full rounded-full px-6 py-3.5 text-base font-bold disabled:opacity-60 sm:w-auto">
          {label}
        </button>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={go} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          autoComplete="given-name"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={inputCls}
        />
        <input
          autoComplete="family-name"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={inputCls}
        />
      </div>
      <input
        required
        type="email"
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputCls}
      />
      <input
        required
        type="tel"
        autoComplete="tel"
        placeholder="Phone (we text you to get you activated)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className={inputCls}
      />
      <button type="submit" disabled={loading} className="btn-primary w-full rounded-full px-6 py-3.5 text-base font-bold disabled:opacity-60">
        {label}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-center text-xs text-muted">Secure Stripe checkout.</p>
    </form>
  );
}
