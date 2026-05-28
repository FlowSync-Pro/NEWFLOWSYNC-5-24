"use client";

import { useState } from "react";

export default function PayButton({ bookingId, label }: { bookingId: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMsg(data.configured === false ? "Payments are temporarily unavailable. Please try again later." : data.error ?? "Couldn't start payment.");
    } catch {
      setMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={pay} disabled={loading} className="btn-primary w-full rounded-full px-6 py-3.5 text-base disabled:opacity-60">
        {loading ? "Starting…" : label}
      </button>
      {msg && <p className="mt-3 text-center text-sm text-muted">{msg}</p>}
    </div>
  );
}
