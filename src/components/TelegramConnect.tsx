"use client";

import { useState, useTransition } from "react";
import { getTelegramLinkUrl } from "@/app/actions/duty";

/** Fleet page: link the driver's Telegram so load offers and assignments reach their phone. */
export default function TelegramConnect({ linked, available }: { linked: boolean; available: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function connect() {
    setError(null);
    start(async () => {
      const r = await getTelegramLinkUrl();
      if (!r.ok) { setError(r.error); return; }
      window.location.href = r.url;
    });
  }
  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-2/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{linked ? "Telegram connected" : "Get loads on your phone"}</p>
          <p className="mt-1 text-xs text-muted">
            {linked
              ? "Load offers and assignments come to your private chat with the FlowSync bot. Send it /status any time, or /unlink to disconnect."
              : "Connect your Telegram once and the FlowSync bot will message you when a load is yours or on offer. We store only the chat id, nothing else from Telegram."}
          </p>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
        {!linked && (
          <button type="button" onClick={connect} disabled={pending || !available} className="btn-primary rounded-full px-5 py-2 text-sm disabled:opacity-60" title={available ? undefined : "Not available yet"}>
            {pending ? "Opening…" : "Connect Telegram"}
          </button>
        )}
      </div>
    </div>
  );
}
