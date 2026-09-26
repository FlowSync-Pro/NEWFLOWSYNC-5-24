"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FLEET, TIERS } from "@/lib/pricing";

/**
 * The two post-checkout add-ons, each a separate $97 Stripe checkout. After
 * either purchase Stripe sends the driver to sign-in, so the page is seen once:
 * Premium is $97 from the account any time, but the fleet invite is $97 only
 * here and $197 afterwards — the copy on the page says so.
 */
export default function PremiumOfferButtons({ sessionId }: { sessionId: string }) {
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
      <button
        type="button"
        onClick={() => start("premium")}
        disabled={loading !== null}
        className="btn-primary w-full rounded-full px-6 py-4 text-base font-bold disabled:opacity-60"
      >
        {loading === "premium" ? "Opening secure checkout…" : `Yes — add Premium for $${TIERS.premium.price}`}
      </button>
      <button
        type="button"
        onClick={() => start("fleet")}
        disabled={loading !== null}
        className="w-full rounded-full border border-accent/40 bg-accent-soft px-6 py-4 text-base font-bold text-accent transition-colors hover:bg-accent-soft/80 disabled:opacity-60"
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
