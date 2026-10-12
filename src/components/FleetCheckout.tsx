"use client";

import { useState } from "react";
import { FLEET, FLEET_SMALL } from "@/lib/pricing";

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

/**
 * Starts a Curri fleet checkout at the full price.
 *  - mode="standalone": homepage / pricing-page visitor, no account. Collects
 *    name, email and phone (the owner onboards fleet drivers by text) and
 *    pays $297, which also creates their FlowSync account + listing.
 *  - mode="member": signed-in driver on the fleet guide. One button, $297.
 *  - smallVehicles (standalone only): the $197 ad page (FLEET_SMALL). Adds a
 *    required vehicle picker limited to the qualifying vehicles; the server
 *    checks it again and the owner confirms it at activation.
 */
export default function FleetCheckout({ mode, smallVehicles = false }: { mode: "standalone" | "member"; smallVehicles?: boolean }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
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
          ? { intent: "fleet-standalone", firstName, lastName, email, phone, ref, ...(smallVehicles ? { variant: "small", vehicle } : {}) }
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

  const price = smallVehicles && mode === "standalone" ? FLEET_SMALL.price : FLEET.price;
  const label = loading ? "Opening secure checkout…" : `Join the fleet — $${price} one-time`;

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
      {smallVehicles && (
        <select required value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={inputCls} aria-label="Your vehicle">
          <option value="" disabled>What do you drive?</option>
          {FLEET_SMALL.vehicles.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full rounded-full px-6 py-3.5 text-base font-bold disabled:opacity-60">
        {label}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-center text-xs text-muted">Secure Stripe checkout.</p>
    </form>
  );
}
