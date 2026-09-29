import Link from "next/link";
import {
  FLEET,
  GUARANTEE_DAYS,
  LISTING_INCREASE_DATE_LABEL,
  LISTING_PRICE_AFTER,
  listingIncreasePending,
  listingPrice,
  PLATFORM_FEE_PERCENT,
  TIERS,
} from "@/lib/pricing";
import { SUPPORT_EMAIL } from "@/lib/site";

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="mt-0.5 h-4 w-4 shrink-0 text-accent">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The full ladder and the plain-English "how this works" — shown on /pricing
 * under the checkout. Its job is to remove surprises (which is where disputes
 * come from) and to show what's next after the listing, using only true
 * urgency: the dated price and the early-mover fact.
 */
export default function TierLadder() {
  const price = listingPrice();
  const pending = listingIncreasePending();

  const STEPS = [
    { t: "Pay once and set your password", d: "Your account is live the moment you pay. Sign in, set your password, and you're in the dashboard." },
    { t: "Build your profile and service menu", d: "Your photo, vehicle, city, the services you offer, and your own prices. Upload your license and insurance so customers see a verified driver." },
    { t: "Follow the setup guides", d: "USDOT and EIN for free, LLC filing, medical courier requirements, and how to sign up with Curri and Dispatch as a carrier instead of a gig driver." },
    { t: "Customers find you and book you directly", d: `You're listed in the directory by service and city. When a customer books through the site, a ${PLATFORM_FEE_PERCENT}% platform fee applies to that job. Bookings depend on your area, your profile, and how you market yourself — we give you the tools, not a guarantee.` },
    { t: "Go further when you're ready", d: `Premium adds the business tools and the Curri mastermind. The fleet gets loads dispatched to you under our carrier account, paid every Friday.` },
  ];

  return (
    <section className="mx-auto mt-14 max-w-5xl">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Three ways in. Start with the listing.</h2>
        <p className="mt-3 text-muted">
          Everything is one-time. Nothing renews. Here&apos;s exactly what each one is, so there are no
          surprises after you pay.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {/* Tier 1 */}
        <div className="card flex flex-col p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Tier 1</p>
          <h3 className="mt-2 text-xl font-bold">{TIERS.standard.name} listing</h3>
          <p className="mt-1 text-3xl font-extrabold text-accent">${price} <span className="text-sm font-normal text-muted">one-time</span></p>
          {pending && <p className="mt-1 text-xs font-medium text-accent">${LISTING_PRICE_AFTER} from {LISTING_INCREASE_DATE_LABEL}</p>}
          <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
            {TIERS.standard.features.map((f) => <li key={f} className="flex gap-2"><Check />{f}</li>)}
            <li className="flex gap-2"><Check />Driver Roadmap and the Telegram community</li>
          </ul>
          <p className="mt-4 text-xs text-muted">{GUARANTEE_DAYS}-day money-back guarantee. Buy above.</p>
        </div>

        {/* Tier 2 */}
        <div className="flex flex-col rounded-2xl border border-accent bg-accent-soft p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Tier 2 · most drivers add this</p>
          <h3 className="mt-2 text-xl font-bold">{TIERS.premium.name}</h3>
          <p className="mt-1 text-3xl font-extrabold text-accent">${TIERS.premium.price} <span className="text-sm font-normal text-muted">one-time</span></p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
            {TIERS.premium.features.map((f) => <li key={f} className="flex gap-2"><Check />{f}</li>)}
          </ul>
          <p className="mt-4 text-xs text-muted">
            {GUARANTEE_DAYS}-day money-back guarantee. Offered right after your listing checkout, and any time from your account.
          </p>
        </div>

        {/* Tier 3 */}
        <div className="card flex flex-col p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Tier 3 · separate</p>
          <h3 className="mt-2 text-xl font-bold">Curri fleet invite</h3>
          <p className="mt-1 text-3xl font-extrabold text-accent">${FLEET.price} <span className="text-sm font-normal text-muted">one-time</span></p>
          <p className="mt-1 text-xs font-medium text-accent">${FLEET.addOnPrice} only on the page right after your listing checkout</p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
            {FLEET.includes.map((f) => <li key={f} className="flex gap-2"><Check />{f}</li>)}
            <li className="flex gap-2"><Check />{FLEET.dispatchFeePercent}% dispatching fee on loads, paid every Friday ({FLEET.fastPayoutFeePercent}% for 1–2 business days). No monthly fee.</li>
          </ul>
          <p className="mt-4 text-xs text-muted">{FLEET.refundShort}{" "}
            <Link href="/refund-policy" className="text-accent hover:underline">Why →</Link>
          </p>
        </div>
      </div>

      {/* How it works, start to finish */}
      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <h3 className="text-lg font-bold">How FlowSync works, start to finish</h3>
          <ol className="mt-4 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold">{s.t}</p>
                  <p className="mt-0.5 text-sm text-muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="card h-fit p-6">
          <h3 className="text-lg font-bold">Before you buy, know this</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li className="flex gap-2"><Check />FlowSync is not a job and not an app that hands you work. It&apos;s your listing, your tools, and the setup to run as a real carrier. Bookings and earnings depend on you and your market.</li>
            <li className="flex gap-2"><Check />Every price is one-time. No subscription, no auto-renewal, nothing charged later without you buying it.</li>
            <li className="flex gap-2"><Check />The listing and Premium carry a {GUARANTEE_DAYS}-day money-back guarantee, no questions asked. The fleet fee is refundable until you&apos;re activated, then earned.</li>
            <li className="flex gap-2"><Check />The fleet runs under one shared carrier account. Two violations means removal, without a refund — that protects every driver on it.</li>
            <li className="flex gap-2"><Check /><span>A real person answers <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">{SUPPORT_EMAIL}</a> within one business day, before or after you pay.</span></li>
          </ul>
          <p className="mt-5 text-xs text-muted">
            The directory is still filling out in most cities, and placement favours drivers already listed.
            {pending ? ` And the listing is $${price} until ${LISTING_INCREASE_DATE_LABEL}, then $${LISTING_PRICE_AFTER}.` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
