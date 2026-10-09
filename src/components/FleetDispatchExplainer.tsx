import Image from "next/image";
import { FLEET } from "@/lib/pricing";

/**
 * How the fleet actually works, shown BEFORE someone pays (/curri-fleet and the
 * homepage fleet section). Every line here describes what the dispatch code
 * does today (src/lib/dispatch.ts, src/lib/telegram-dispatch.ts) — change the
 * code, change this copy. Urgency comes only from how dispatch really works
 * (nearest Active drivers, first Accept wins) and the real monthly cap; no
 * timers, no invented scarcity, no earnings promises (AGENTS.md section E).
 * Server components, plain JSX.
 */

// A sample load for the offer preview — clearly labelled as a sample.
const SAMPLE_LOAD_CENTS = 12000;
const sampleNet = () => SAMPLE_LOAD_CENTS - Math.round((SAMPLE_LOAD_CENTS * FLEET.dispatchFeePercent) / 100);
const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** The load offer as it arrives on the driver's phone — same format as the real Telegram message. */
export function FleetOfferPreview() {
  return (
    <figure className="max-w-sm">
      <div className="rounded-2xl border border-border bg-surface-2 p-4 shadow-lg shadow-black/30">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">FS</span>
          <div>
            <p className="text-sm font-semibold leading-tight">FlowSync Dispatch</p>
            <p className="text-[11px] text-muted">Telegram · bot</p>
          </div>
        </div>
        <div className="mt-3 space-y-1 font-mono text-[12.5px] leading-relaxed text-foreground/90">
          <p className="font-sans text-sm font-semibold text-foreground">📦 LOAD OFFER — first to accept gets it (3 min).</p>
          <p>Pickup: building supply yard · 2:30 PM PT</p>
          <p>Drop: job site · ~24 mi</p>
          <p>Vehicle: cargo van · 2 pallets, liftgate</p>
          <p className="pt-1 font-sans font-semibold text-accent">
            Your pay: {usd(sampleNet())} (load {usd(SAMPLE_LOAD_CENTS)} − {FLEET.dispatchFeePercent}% dispatching fee)
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2" aria-hidden="true">
          <span className="rounded-lg bg-accent py-2 text-center text-sm font-semibold text-background">✅ Accept</span>
          <span className="rounded-lg border border-border py-2 text-center text-sm text-muted">Pass</span>
        </div>
      </div>
      <figcaption className="mt-2 text-xs text-muted">
        Sample offer in the real format. Every load is different — pay, distance and volume depend on your market.
      </figcaption>
    </figure>
  );
}

const CONTROL = [
  {
    title: "You switch offers on and off",
    body: "Go Active when you want work, Inactive when you don't. You switch off on your own after the hours you set.",
  },
  {
    title: "You see the pay before you say yes",
    body: `Pickup, drop-off, miles, vehicle and your take-home after the ${FLEET.dispatchFeePercent}% fee — before you tap anything.`,
  },
  {
    title: "Accept or Pass — your call",
    body: "Passing is fine. You only commit when you tap Accept, so only accept loads you'll run.",
  },
  {
    title: "A real dispatcher on the other end",
    body: "Running late or stuck at a dock? Message the same bot — it goes straight to Nasser, and his answer comes back in that chat.",
  },
];

/** The four things drivers ask about control and support. */
export function FleetControlPoints() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {CONTROL.map((c) => (
        <li key={c.title} className="card p-5">
          <p className="font-semibold">{c.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.body}</p>
        </li>
      ))}
    </ul>
  );
}

const timeline = () => [
  {
    title: "Join",
    body: `${FLEET.price} one-time, and your full FlowSync driver account comes with it. ${FLEET.refundShort.split(".")[0]}.`,
  },
  {
    title: "Send your city and vehicle",
    body: "Nasser personally adds you to our Curri carrier account — usually the same day once he has your details.",
  },
  {
    title: "Two quick setups",
    body: "Set up Stripe payouts (about 5 minutes — your bank details go to Stripe, not to us), and once you're activated, connect the free Telegram app with one tap from your account.",
  },
  {
    title: "Go Active, get offers",
    body: "Offers go to the Active drivers nearest the pickup, and the first to tap Accept gets the load. We bid it or claim it in Curri, and you run it.",
  },
  {
    title: "Paid every Friday",
    body: `Through Stripe, minus the ${FLEET.dispatchFeePercent}% dispatching fee (or ${FLEET.fastPayoutFeePercent}% if you want it in 1–2 business days). You're an independent contractor with a 1099 at year end.`,
  },
];

/** What happens between paying and the first payout — no surprises. */
export function FleetJoinTimeline() {
  const steps = timeline();
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
            {i + 1}
          </span>
          <div>
            <p className="font-semibold">{s.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Fleet questions — also the FAQPage structured data on /curri-fleet, so keep the answers plain text. */
export const fleetFaq = () => [
  {
    q: "How is this different from signing up with Curri myself?",
    a: "You run loads on Barham Transport's Curri carrier account instead of waiting on your own approval, and we bid loads rather than only taking the listed price. If you later get your own carrier account, using both is up to you.",
  },
  {
    q: "How do loads reach me?",
    a: "On Telegram. When a load fits your vehicle, radius and trip length while you're Active, you get an offer with the pickup, drop-off, miles and your take-home pay, plus Accept and Pass buttons. Offers go to the nearest Active drivers and the first to accept gets the load. Your open offers and loads are also listed in your account.",
  },
  {
    q: "Do I have to take every load?",
    a: "No. Pass on anything that doesn't suit you, and go Inactive whenever you don't want offers. Once you accept, we claim the load for you in Curri, so only accept loads you'll run — backing out after that counts against the carrier account.",
  },
  {
    q: "How and when do I get paid?",
    a: `Every Friday through Stripe, with a ${FLEET.dispatchFeePercent}% dispatching fee taken from the load. Want it sooner? Choose payment in 1–2 business days for a ${FLEET.fastPayoutFeePercent}% fee. You're paid as an independent contractor and receive a 1099 at year end.`,
  },
  {
    q: "What does it cost?",
    a: `$${FLEET.price} one-time, which includes your full FlowSync driver account and everything in Premium. No monthly fee and no insurance charge. The ${FLEET.dispatchFeePercent}% fee applies only to loads we bring you — no loads that week, no fee that week.`,
  },
  {
    q: "What if I change my mind?",
    a: `${FLEET.refundShort} Two violations on the carrier account means removal from the fleet without a refund.`,
  },
  {
    q: "What vehicles can join?",
    a: "Sedan through box truck. Each offer lists the vehicle the load needs, and you're only offered loads your vehicle can carry.",
  },
  {
    q: "How many loads will I get?",
    a: "It depends on your market and how often you're Active — we can't promise a number. We take on a limited number of new drivers each month so each one gets real dispatch support.",
  },
  {
    q: "Is FlowSync part of Curri?",
    a: "No. FlowSync and Barham Transport LLC are independent and are not owned by, affiliated with, or part of Curri.",
  },
];

export function FleetFaq() {
  return (
    <div className="space-y-3">
      {fleetFaq().map((item) => (
        <details key={item.q} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
            {item.q}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-accent transition-transform group-open:rotate-45">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

// ---- Real proof -------------------------------------------------------------
// The owner's own screenshots of fleet runs (public/proof/, built by cropping
// the originals): the driver agreed to be shown by first name; his last name,
// customer photos and the Curri screen behind the pop-up are blurred. Captions
// state only what the screenshots show.

const SAMPLE_PAYOUT_CENTS = 10753; // the $107.53 on the delivery record below
const driverShare = () => SAMPLE_PAYOUT_CENTS - Math.round((SAMPLE_PAYOUT_CENTS * FLEET.dispatchFeePercent) / 100);

const PROOF = () => [
  {
    src: "/proof/fleet-proof-assigned.webp",
    width: 640,
    height: 732,
    alt: "Text thread: a fleet driver says \"Good to go\", the Curri assignment notice for a scheduled 10:30 AM pickup in Chippewa Falls, WI, and his reply \"Yessir! Appreciate you\".",
    title: "The night before",
    caption: "Curri's assignment for a scheduled 10:30 AM pickup in Chippewa Falls, WI — and Elliot's reply.",
  },
  {
    src: "/proof/fleet-proof-delivered.webp",
    width: 640,
    height: 1202,
    alt: "Curri delivery record: Toyota Prius, driver Elliot, two boxes, Chippewa Falls to Grantsburg, WI, payout $107.53 paid Sep 21.",
    title: "Delivered and paid",
    caption: `Chippewa Falls to Grantsburg, WI. Curri paid ${usd(SAMPLE_PAYOUT_CENTS)} for the run — at the standard ${FLEET.dispatchFeePercent}% fee, the driver's share is ${usd(driverShare())}.`,
  },
  {
    src: "/proof/fleet-proof-multistop.webp",
    width: 640,
    height: 1202,
    alt: "Curri delivery record: one pickup in Chippewa Falls, WI and drop-offs in Cameron and Bruce, WI, started 10:12 AM and completed 11:01 AM.",
    title: "Another run",
    caption: "One pickup, two drop-offs (Cameron and Bruce, WI) — started 10:12 AM, done by 11:01 AM.",
  },
];

/** Real runs from the fleet, shown as screenshots — the antidote to "is this real?". */
export function FleetRealLoads() {
  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PROOF().map((p) => (
          <figure key={p.src} className="card overflow-hidden p-3">
            <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
              <Image src={p.src} width={p.width} height={p.height} alt={p.alt} sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw" className="h-auto w-full" />
            </div>
            <figcaption className="px-1 pb-1 pt-3">
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{p.caption}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Real runs from a fleet driver, shared with his permission (last name and customer photos hidden). Real loads, not a
        promise — every load is different and volume depends on your market. FlowSync and Barham Transport are not affiliated
        with Curri.
      </p>
    </div>
  );
}
