"use client";

import { FLEET, listingPrice } from "@/lib/pricing";

import { useState } from "react";

export interface ReferralCardProps {
  code: string;
  referred: number;
  remaining: number;
  rewarded: boolean;
  fleetReferred: number;
  threshold: number;
  shareBase: string; // e.g. https://flowsyncdriver.com
}

// The fleet bonus is only owed for drivers who first signed up on or after this
// date. Formatted in UTC so the server and the browser print the same day.
const bonusStart = FLEET.referralBonusStartsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

// Short bonus terms, shown under the fleet link. Owner-approved; flagged for an
// attorney's review alongside the other terms.
const FLEET_BONUS_TERMS = [
  `You earn $${FLEET.referralBonus} for each driver who first signs up through your referral link on or after ${bonusStart}, joins the Curri fleet, and is then activated on our carrier account.`,
  "The bonus is paid after they're activated, not when they pay. We'll contact you to arrange payment.",
  "No bonus if their fleet fee is refunded before activation.",
  "Your link has to be used when they sign up — we can't add a referral afterwards.",
  "Referring yourself, or a second account of your own, doesn't count.",
  "When you share your link, tell people you get a bonus if they join.",
  "This is in addition to the Premium reward for referring drivers who get listed.",
  "We can change or end the program at any time. Bonuses already earned are still paid.",
  "Bonuses may be taxable income. If yours add up to $600 or more in a year, we'll ask for your tax details (W-9).",
];

/** Copy-to-clipboard, falling back to the native share sheet's own copy when blocked. */
function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the input is selectable as a fallback
    }
  };
  return { copied, copy };
}

async function shareOrCopy(text: string, url: string, copy: () => Promise<void>) {
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try { await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title: "FlowSync", text, url }); return; } catch {}
  }
  copy();
}

export default function ReferralCard({ code, referred, remaining, rewarded, fleetReferred, threshold, shareBase }: ReferralCardProps) {
  const link = `${shareBase}/pricing?ref=${code}`;
  const fleetLink = `${shareBase}/?ref=${code}#curri-fleet`;
  const { copied, copy } = useCopy(link);
  const fleet = useCopy(fleetLink);

  // Both rewards are a material connection, so the share text discloses them (FTC).
  const share = () =>
    shareOrCopy(
      `I'm getting booked through FlowSync — driver-owned delivery where you set your own rates. Get listed for $${listingPrice()}. Heads up: I earn a reward if you sign up through my link.`,
      link,
      copy,
    );
  const shareFleet = () =>
    shareOrCopy(
      `I'm on FlowSync — driver-owned delivery where you set your own rates. Heads up: if you join their Curri fleet through my link, I get a $${FLEET.referralBonus} referral bonus.`,
      fleetLink,
      fleet.copy,
    );

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

      {/* Fleet referral bonus — paid manually by the owner after activation. */}
      <div className="mt-6 border-t border-border pt-5">
        <h3 className="font-bold">Fleet bonus: ${FLEET.referralBonus}</h3>
        <p className="mt-1.5 text-sm text-muted">
          Refer a driver who joins our Curri fleet and we&apos;ll send you ${FLEET.referralBonus} once they&apos;re activated on
          the carrier account. When you share your link, let people know you get a bonus.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={fleetLink}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 select-all rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-muted outline-none"
          />
          <div className="flex gap-2">
            <button onClick={fleet.copy} className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
              {fleet.copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={shareFleet} className="btn-primary rounded-xl px-5 py-2.5 text-sm">Share</button>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted">
          {fleetReferred === 1 ? "1 driver has" : `${fleetReferred} drivers have`} joined the fleet through your link.
        </p>
        <details className="mt-3 text-xs text-muted">
          <summary className="cursor-pointer hover:text-foreground">Fleet bonus terms</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {FLEET_BONUS_TERMS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
