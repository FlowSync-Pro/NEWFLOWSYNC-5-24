"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { premiumOfferPrice } from "@/lib/pricing";

/**
 * Offer page A: Premium for the difference from Verified. Declining goes to
 * offer page B (the fleet at its without-Premium price), not straight to
 * sign-in, so both paths reach the fleet offer.
 */
export default function PremiumOfferButtons({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: "oto-upgrade", session_id: sessionId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "That offer is temporarily unavailable. You can upgrade later from your account.");
    } catch {
      setError("Something went wrong. You can upgrade later from your account.");
    } finally {
      setLoading(false);
    }
  };

  const decline = () => {
    router.push(`/welcome/fleet-offer?session_id=${encodeURIComponent(sessionId)}`);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={accept}
        disabled={loading}
        className="btn-primary w-full rounded-full px-6 py-4 text-base font-bold disabled:opacity-60"
      >
        {loading ? "Opening secure checkout…" : `Yes — add Premium for $${premiumOfferPrice()}`}
      </button>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={decline}
        disabled={loading}
        className="w-full text-center text-sm text-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-60"
      >
        No thanks, I&apos;ll stay on Verified
      </button>
    </div>
  );
}
