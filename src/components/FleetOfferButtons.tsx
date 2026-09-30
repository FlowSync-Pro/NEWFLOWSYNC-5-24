"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Offer page B: the fleet at this buyer's offer price, or skip to sign-in. */
export default function FleetOfferButtons({ sessionId, price }: { sessionId: string; price: number }) {
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
        body: JSON.stringify({ intent: "oto-fleet", session_id: sessionId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "That offer is temporarily unavailable. You can join the fleet later from your account.");
    } catch {
      setError("Something went wrong. You can join the fleet later from your account.");
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    router.push(`/signin?checkout=success&session_id=${encodeURIComponent(sessionId)}`);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={accept}
        disabled={loading}
        className="btn-primary w-full rounded-full px-6 py-4 text-base font-bold disabled:opacity-60"
      >
        {loading ? "Opening secure checkout…" : `Yes — activate me on the fleet for $${price} more`}
      </button>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={skip}
        disabled={loading}
        className="w-full text-center text-sm text-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-60"
      >
        No thanks, take me to sign in
      </button>
    </div>
  );
}
