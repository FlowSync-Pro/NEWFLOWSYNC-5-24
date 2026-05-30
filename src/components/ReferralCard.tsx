"use client";

import { useState } from "react";

export interface ReferralCardProps {
  code: string;
  referred: number;
  remaining: number;
  rewarded: boolean;
  threshold: number;
  shareBase: string; // e.g. https://flowsyncdriver.com
}

export default function ReferralCard({ code, referred, remaining, rewarded, threshold, shareBase }: ReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const link = `${shareBase}/pricing?ref=${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the input is selectable as a fallback
    }
  };

  const share = async () => {
    const text = "I'm getting booked through FlowSync — driver-owned delivery where you keep 95%. Get listed for $17:";
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title: "FlowSync", text, url: link }); return; } catch {}
    }
    copy();
  };

  const pct = Math.min(100, Math.round((referred / threshold) * 100));

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">Refer drivers, earn Premium</h2>
        <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-[#04130a]">Free</span>
      </div>
      <p className="mt-1.5 text-sm text-muted">
        Share your link. When {threshold} drivers you refer get listed, you&apos;re upgraded to{" "}
        <span className="font-medium text-foreground">Premium ($97 value)</span> — on the house.
      </p>

      {/* progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">{referred} referred</span>
          {rewarded ? (
            <span className="font-semibold text-accent">★ Premium unlocked</span>
          ) : (
            <span className="font-semibold text-accent">{remaining} to go</span>
          )}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${rewarded ? 100 : pct}%` }} />
        </div>
      </div>

      {/* link + actions */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 select-all rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-muted outline-none"
        />
        <div className="flex gap-2">
          <button onClick={copy} className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={share} className="btn-primary rounded-xl px-5 py-2.5 text-sm">Share</button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Tip: your referral link also brings <span className="text-foreground">customers</span> who book you —
        share it with everyone you deliver for.
      </p>
    </section>
  );
}
