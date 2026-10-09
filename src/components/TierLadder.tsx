import Link from "next/link";
import { FLEET, GUARANTEE_DAYS, PLATFORM_FEE_PERCENT } from "@/lib/pricing";
import { SUPPORT_EMAIL } from "@/lib/site";

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="mt-0.5 h-4 w-4 shrink-0 text-accent">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The plain-English "how this works" under the pricing checkout. Its job is
 * to remove surprises (which is where disputes come from). The pricing page
 * sells the listing only; Premium and the fleet are described without prices
 * here and offered after checkout and from the account (lib/pricing).
 */
export default function TierLadder() {
  const STEPS = [
    { t: "Pay once and set your password", d: "Your account is live the moment you pay. Sign in, set your password, and you're in the dashboard." },
    { t: "Build your profile and service menu", d: "Your photo, vehicle, city, the services you offer, and your own prices. Upload your license and insurance so customers see a verified driver." },
    { t: "Follow the setup guides", d: "USDOT and EIN for free, LLC filing, medical courier requirements, and how to sign up with Curri and Dispatch as a carrier instead of a gig driver." },
    { t: "Customers find you and book you directly", d: `You're listed in the directory by service and city. When a customer books through the site, a ${PLATFORM_FEE_PERCENT}% platform fee applies to that job. Bookings depend on your area, your profile, and how you market yourself — we give you the tools, not a guarantee.` },
    { t: "Go further when you're ready", d: "Right after checkout you'll see two optional one-time offers: Premium (the bidding calculator, the business P&L tracker, every guide, the Curri mastermind course, badge and priority placement) and the Curri fleet (loads dispatched to you under our carrier account, paid every Friday). Both are also available from your account any time." },
  ];

  return (
    <section className="mx-auto mt-14 max-w-5xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-lg font-bold">How FlowSync works, start to finish</h2>
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
          <h2 className="text-lg font-bold">Before you buy, know this</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li className="flex gap-2"><Check /><span>FlowSync is not a job and not an app that hands you work. It&apos;s your listing, your tools, and the setup to run as a real carrier. Bookings and earnings depend on you and your market.</span></li>
            <li className="flex gap-2"><Check /><span>Every price is one-time. No subscription, no auto-renewal, nothing charged later without you buying it.</span></li>
            <li className="flex gap-2"><Check /><span>The listing and Premium carry a {GUARANTEE_DAYS}-day money-back guarantee, no questions asked. The fleet fee has its own guarantee: make your ${FLEET.price} back in your first {FLEET.guaranteeDays} days on the fleet, or a full refund. <Link href="/refund-policy" className="text-accent hover:underline">Refund policy →</Link></span></li>
            <li className="flex gap-2"><Check /><span>The fleet runs under one shared carrier account with a {FLEET.dispatchFeePercent}% dispatching fee on loads. Two violations means removal, without a refund — that protects every driver on it.</span></li>
            <li className="flex gap-2"><Check /><span>A real person answers <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">{SUPPORT_EMAIL}</a> within one business day, before or after you pay.</span></li>
          </ul>
          <p className="mt-5 text-xs text-muted">
            The directory is still filling out in most cities, and placement favours drivers already listed.
          </p>
        </div>
      </div>
    </section>
  );
}
