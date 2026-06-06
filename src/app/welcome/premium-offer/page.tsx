import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { TIERS } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";
import TrackEvent from "@/components/TrackEvent";
import PremiumOfferButtons from "@/components/PremiumOfferButtons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome — one quick thing",
  robots: { index: false },
  alternates: { canonical: `${SITE_URL}/welcome/premium-offer` },
};

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const COMPARE: { label: string; standard: string | boolean; premium: string | boolean }[] = [
  { label: "Listed in the FlowSync driver directory", standard: true, premium: true },
  { label: "Keep 95% of every job — direct customer bookings", standard: true, premium: true },
  { label: "Fair-quote calculator + Profit & Loss tracker", standard: true, premium: true },
  { label: "DOT & EIN setup guide", standard: true, premium: true },
  { label: "Roadmap, member resources, referral program", standard: true, premium: true },
  { label: "★ Premium badge on your public profile", standard: false, premium: true },
  { label: "Featured placement above other drivers in the directory", standard: false, premium: true },
  { label: "Build a custom service menu with your own prices", standard: false, premium: true },
  { label: "Link your external website on your profile", standard: false, premium: true },
];

export default async function PremiumOfferPage({ searchParams }: PageProps<"/welcome/premium-offer">) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : Array.isArray(sp.session_id) ? sp.session_id[0] : "";

  // Without a session id this page has nothing to offer. Send people to the
  // normal post-checkout landing.
  if (!sessionId) redirect("/signin?checkout=success");

  // Validate the original $17 listing session and capture the real amount paid
  // for the Meta Pixel Purchase event. If the session doesn't exist or wasn't
  // paid, fall through to the normal sign-in landing.
  let purchaseValue = 17;
  const stripe = getStripe();
  if (stripe) {
    try {
      const cs = await stripe.checkout.sessions.retrieve(sessionId);
      if (cs.payment_status !== "paid" || cs.metadata?.type !== "listing") {
        redirect("/signin?checkout=success");
      }
      if (typeof cs.amount_total === "number") purchaseValue = cs.amount_total / 100;
    } catch {
      redirect("/signin?checkout=success");
    }
  }

  return (
    <div className="relative min-h-[80vh]">
      {/* Fire the listing Purchase event here (was on /signin?checkout=success). */}
      <TrackEvent event="Purchase" value={purchaseValue} eventId={sessionId} />
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto max-w-3xl px-5 py-12">
        {/* Receipt */}
        <div className="card flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-[#04130a]">
            <Check />
          </span>
          <div className="flex-1">
            <p className="text-base font-bold">Payment received.</p>
            <p className="text-sm text-muted">
              Your welcome email is on the way — check inbox (and spam) for your sign-in details.
            </p>
          </div>
        </div>

        {/* OTO header */}
        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
            ★ One-time offer · for new drivers only
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Wait — most drivers add Premium right here.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            You can always upgrade later from your account. But Premium is{" "}
            <span className="text-foreground">${TIERS.premium.price} one-time</span> — same price
            forever — and it makes your listing stand out from day one.
          </p>
        </div>

        {/* Compare */}
        <div className="card mt-8 overflow-hidden p-0">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-5 px-5 py-4 text-xs font-semibold uppercase tracking-widest">
            <div className="text-muted">&nbsp;</div>
            <div className="text-center text-muted">Verified</div>
            <div className="rounded-t-md bg-accent px-3 text-center text-[#04130a]">Premium</div>
          </div>
          {COMPARE.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr_auto_auto] gap-x-5 px-5 py-3 text-sm ${i % 2 ? "bg-surface" : "bg-surface/40"}`}
            >
              <div>{row.label}</div>
              <div className="flex w-16 items-center justify-center">
                {row.standard === true ? (
                  <span className="text-accent"><Check /></span>
                ) : (
                  <span className="text-muted/40">—</span>
                )}
              </div>
              <div className="flex w-20 items-center justify-center bg-accent-soft">
                {row.premium === true ? (
                  <span className="text-accent"><Check /></span>
                ) : (
                  <span className="text-muted/40">—</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="card mt-8 p-7">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold">Add Premium today</span>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-accent">${TIERS.premium.price}</span>
              <span className="ml-1 text-xs text-muted">one-time</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">
            Same 30-day money-back guarantee. Same secure Stripe checkout.
          </p>
          <div className="mt-6">
            <PremiumOfferButtons sessionId={sessionId} />
          </div>
        </div>
      </div>
    </div>
  );
}
