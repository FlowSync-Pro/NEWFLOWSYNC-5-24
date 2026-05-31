"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BUMPS,
  GUARANTEE_DAYS,
  PLATFORM_FEE_PERCENT,
  TIERS,
  VALUE_STACK,
  VALUE_STACK_TOTAL,
} from "@/lib/pricing";
import { SUPPORT_EMAIL } from "@/lib/site";
import type { SocialProof } from "@/lib/social-proof";

function Check({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Rotating "just listed" ticker built only from real recent signups. */
function ActivityTicker({ recent }: { recent: SocialProof["recent"] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (recent.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % recent.length), 3500);
    return () => clearInterval(t);
  }, [recent.length]);
  if (recent.length === 0) return null;
  const r = recent[i];
  const where = r.city ? ` in ${r.city}` : "";
  const when = r.agoHours < 24 ? `${r.agoHours}h ago` : `${Math.round(r.agoHours / 24)}d ago`;
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      <span><span className="font-medium text-foreground">{r.name}</span>{where} just got listed · {when}</span>
    </div>
  );
}

export default function OfferCheckout({ proof, referralCode = "" }: { proof: SocialProof; referralCode?: string }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist a referral code so it survives navigation away from ?ref=… and back.
  useEffect(() => {
    if (referralCode) {
      try { localStorage.setItem("fs_ref", referralCode); } catch {}
    }
  }, [referralCode]);

  const tier = TIERS.standard;
  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  async function handleCheckout() {
    setError(null);
    setLoading(true);
    try {
      const bumps = BUMPS.filter((b) => selected[b.id]).map((b) => b.id);
      let ref = referralCode;
      try { ref = ref || localStorage.getItem("fs_ref") || ""; } catch {}
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier: "standard", bumps, ref }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Checkout is temporarily unavailable. Please try again in a moment.");
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const { total, lineItems } = useMemo(() => {
    const items: { label: string; price: number }[] = [{ label: `${tier.name} listing`, price: tier.price }];
    for (const b of BUMPS) if (selected[b.id]) items.push({ label: b.name, price: b.price });
    return { total: items.reduce((s, i) => s + i.price, 0), lineItems: items };
  }, [selected, tier]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          One-time setup — no monthly fees
        </span>
        <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          Get listed. Get booked. <span className="text-accent">Keep 95%.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Get in the directory and start taking direct bookings. We only take{" "}
          {PLATFORM_FEE_PERCENT}% — you set the price and keep the rest.
        </p>

        {/* Social proof: real count once we have scale, founding-driver framing before that */}
        <div className="mt-6 flex flex-col items-center gap-2">
          {proof.showCount ? (
            <p className="text-sm">
              <span className="font-bold text-accent">{proof.totalDrivers.toLocaleString()}</span> drivers
              listed{proof.joinedThisWeek > 0 && <> · <span className="font-semibold text-foreground">{proof.joinedThisWeek}</span> joined this week</>}
            </p>
          ) : (
            <p className="text-sm font-medium text-accent">
              ⚡ Founding-driver access — be one of the first in your city
            </p>
          )}
          <ActivityTicker recent={proof.recent} />
        </div>
      </div>

      {/* Cost-of-waiting / FOMO band */}
      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-5 text-center">
        <p className="text-sm font-semibold text-amber-300">Every week you&apos;re not listed, the booking goes to someone else.</p>
        <p className="mt-1 text-sm text-muted">
          Customers in your area are booking the drivers who show up in the directory <span className="text-foreground">today</span>.
          The earliest drivers lock in the top spots — and the repeat customers that come with them. That window doesn&apos;t stay open.
        </p>
      </div>

      {/* Standard offer + value stack */}
      <div className="mx-auto mt-8 max-w-2xl">
        <div className="rounded-2xl border border-accent bg-accent-soft p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-lg font-bold">{tier.name} listing</span>
              <p className="mt-1 text-sm text-muted">{tier.tagline}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-3xl font-extrabold text-accent">${tier.price}</span>
              <span className="block text-xs text-muted">one-time</span>
            </div>
          </div>

          {/* Value stack — everything included, anchored against standalone value */}
          <div className="mt-5 space-y-2 border-t border-accent/20 pt-5">
            {VALUE_STACK.map((v) => (
              <div key={v.label} className="flex items-center gap-2 text-sm">
                <span className="text-accent"><Check className="h-4 w-4" /></span>
                <span className="flex-1">{v.label}</span>
                <span className="text-muted line-through">${v.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-accent/20 pt-3 text-sm">
              <span className="font-semibold">Total value</span>
              <span className="font-semibold text-muted line-through">${VALUE_STACK_TOTAL}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold">Your price today</span>
              <span className="text-2xl font-extrabold text-accent">${tier.price}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Want a custom service menu, a premium badge &amp; priority placement? Upgrade to{" "}
          <span className="font-medium text-foreground">Premium (${TIERS.premium.price})</span>{" "}
          anytime from your account after you&apos;re set up.
        </p>
      </div>

      <div className={`mt-8 ${BUMPS.length > 0 ? "grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start" : "mx-auto max-w-md"}`}>
        {/* Optional paid add-ons (none right now — DOT & EIN is bundled into Standard) */}
        {BUMPS.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Power up your launch</p>
          <div className="space-y-4">
            {BUMPS.map((b) => {
              const on = !!selected[b.id];
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggle(b.id)}
                  className={`block w-full rounded-2xl border p-5 text-left transition-colors ${
                    on ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${on ? "border-accent bg-accent text-[#04130a]" : "border-border text-transparent"}`}>
                      <Check className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">Add: {b.name}</span>
                        {b.badge && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">{b.badge}</span>}
                        <span className="ml-auto text-lg font-bold text-accent">+${b.price}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{b.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* Order summary */}
        <aside className={BUMPS.length > 0 ? "lg:sticky lg:top-24" : ""}>
          <div className="card p-7">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="mt-5 space-y-3">
              {lineItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{item.label}</span>
                  <span className="font-medium">${item.price}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <span className="font-semibold">One-time payment</span>
              <span className="text-2xl font-bold text-accent">${total}</span>
            </div>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            <button type="button" onClick={handleCheckout} disabled={loading} className="btn-primary mt-6 w-full rounded-full px-6 py-3.5 text-base disabled:opacity-60">
              {loading ? "Starting checkout…" : `Get listed now — $${total}`}
            </button>
            <p className="mt-2 text-center text-xs text-muted">You&apos;ll set up your name and service right after payment.</p>

            {/* Risk reversal — the named, loud money-back guarantee */}
            <div className="mt-5 rounded-xl border border-accent/40 bg-accent-soft p-4 text-center">
              <p className="text-sm font-bold text-accent">The {GUARANTEE_DAYS}-Day &ldquo;Get Booked&rdquo; Guarantee</p>
              <p className="mt-1 text-xs text-muted">
                List risk-free. If you don&apos;t love FlowSync within {GUARANTEE_DAYS} days, email{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-accent hover:underline">{SUPPORT_EMAIL}</a>{" "}
                for a full refund — no questions, no hard feelings. The risk is entirely on us.
              </p>
            </div>

            <div className="mt-5 space-y-2 text-xs text-muted">
              <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" /> Only {PLATFORM_FEE_PERCENT}% per job — no monthly fees, ever</p>
              <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" /> Set up in about 3 minutes</p>
              <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" /> You keep 95% of every job you book</p>
            </div>

            {/* Trust badges */}
            <div className="mt-5 flex items-center justify-center gap-4 border-t border-border pt-4 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-accent"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Secure SSL
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-accent"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" /></svg>
                256-bit encrypted
              </span>
              <span>Powered by Stripe</span>
            </div>
          </div>

          {/* What happens next */}
          <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">What happens next</p>
            <ol className="mt-3 space-y-3 text-sm">
              {[
                "Pay securely — it takes under a minute.",
                "Set up your profile (name, vehicle, your service).",
                "Go live in the directory and start getting found by local customers.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-[#04130a]">{i + 1}</span>
                  <span className="text-muted">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
