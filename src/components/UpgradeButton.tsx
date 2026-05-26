"use client";

import { useState } from "react";

export default function UpgradeButton({
  label = "Upgrade to Premium — $97",
  className = "btn-primary rounded-full px-7 py-3.5 text-sm",
}: {
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: "upgrade" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMsg(data.configured === false ? "Payments aren't enabled yet (demo)." : data.error ?? "Couldn't start the upgrade.");
    } catch {
      setMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={go} disabled={loading} className={`${className} disabled:opacity-60`}>
        {loading ? "Starting…" : label}
      </button>
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
    </div>
  );
}
