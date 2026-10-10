import Link from "next/link";
import { premiumUpgradePrice, TIERS } from "@/lib/pricing";
import UpgradeButton from "@/components/UpgradeButton";

/**
 * Locked-state card for Premium (Tier 2) features. Shown to Tier 1 drivers
 * in place of the tool, with the upgrade button right there.
 */
export default function ProGate({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="relative mx-auto max-w-2xl px-5 py-12">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative card p-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
          Part of Premium
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">{blurb}</p>
        <ul className="mx-auto mt-5 max-w-md space-y-1.5 text-left text-sm text-muted">
          {TIERS.premium.features.slice(1).map((f) => (
            <li key={f} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col items-center gap-3">
          <UpgradeButton label={`Upgrade to Premium — $${premiumUpgradePrice()} one-time`} />
          <p className="text-xs text-muted">Secure Stripe checkout. Refunds within 7 days of purchase.</p>
        </div>
        <Link href="/account" className="mt-5 inline-block text-sm text-muted hover:text-foreground">
          ← Back to your account
        </Link>
      </div>
    </div>
  );
}
