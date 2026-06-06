"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PremiumOfferButtons({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPremium = async () => {
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
      setError(data.error ?? "Upgrade is temporarily unavailable. You can also upgrade later from your account.");
    } catch {
      setError("Something went wrong. You can also upgrade later from your account.");
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    router.push(`/signin?checkout=success&session_id=${encodeURIComponent(sessionId)}`);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={addPremium}
        disabled={loading}
        className="btn-primary w-full rounded-full px-6 py-4 text-base font-bold disabled:opacity-60"
      >
        {loading ? "Opening secure checkout…" : "Yes — add Premium for $97"}
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
