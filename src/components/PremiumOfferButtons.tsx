"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FLEET, premiumUpgradePrice } from "@/lib/pricing";

/**
 * The post-checkout add-ons, each its own Stripe checkout. Premium costs the
 * difference from Verified (Premium's price includes the listing); the fleet
 * invite is offer-page-only at its lower price. A buyer who already bought
 * Premium outright only sees the fleet button.
 */
export default function PremiumOfferButtons({ sessionId, alreadyPremium = false }: { sessionId: string; alreadyPremium?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"premium" | "fleet" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (which: "premium" | "fleet") => {
    setError(null);
    setLoading(which);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: which === "premium" ? "oto-upgrade" : "oto-fleet", session_id: sessionId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "That offer is temporarily unavailable. You can also do this later from your account.");
    } catch {
      setError("Something went wrong. You can also do this later from your account.");
    } finally {
      setLoading(null);
    }
  };

  const skip = () => {
    router.push(`/signin?checkout=success&session_id=${encodeURIComponent(sessionId)}`);
  };

  return (
    <div className="space-y-3">
      {!alreadyPremium && (
        <button
          type="button"
          onClick={() => start("premium")}
          disabled={loading !== null}
          className="btn-primary w-full rounded-full px-6 py-4 text-base font-bold disabled:opacity-60"
        >
          {loading === "premium" ? "Opening secure checkout…" : `Yes — add Premium for $${premiumUpgradePrice()} more`}
        </button>
      )}
      <button
        type="button"
        onClick={() => start("fleet")}
        disabled={loading !== null}
        className={`w-full rounded-full px-6 py-4 text-base font-bold transition-colors disabled:opacity-60 ${
          alreadyPremium ? "btn-primary" : "border border-accent/40 bg-accent-soft text-accent hover:bg-accent-soft/80"
        }`}
      >
        {loading === "fleet" ? "Opening secure checkout…" : `Add the Curri fleet invite for $${FLEET.addOnPrice} (normally $${FLEET.price})`}
      </button>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={skip}
        disabled={loading !== null}
        className="w-full text-center text-sm text-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-60"
      >
        No thanks, take me to sign in
      </button>
    </div>
  );
}
