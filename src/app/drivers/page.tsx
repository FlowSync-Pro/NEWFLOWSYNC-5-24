import Link from "next/link";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import JsonLd, { faqLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "For Drivers — FlowSync",
  description:
    "Why drivers choose FlowSync: keep more of every job, build your own profile and reputation, and work across eight delivery services.",
  alternates: { canonical: `${SITE_URL}/drivers` },
};

const COMPARE = [
  { label: "Platform fee", flowsync: "Low flat fee", others: "20–40% commission" },
  { label: "Your profile", flowsync: "Branded, service-matched", others: "Anonymous worker" },
  { label: "Customer relationship", flowsync: "Yours to keep", others: "Owned by the app" },
  { label: "Services available", flowsync: "8 categories", others: "Usually 1" },
  { label: "Set your own rates", flowsync: "Yes", others: "Rarely" },
  { label: "Same-day pay", flowsync: "Yes", others: "Sometimes (for a fee)" },
];

const FAQ = [
  {
    q: "How much does it cost to join?",
    a: "Nothing to sign up. FlowSync takes a low flat fee per completed job instead of a large percentage commission, so the more you earn the more you keep.",
  },
  {
    q: "Can I offer more than one service?",
    a: "Absolutely. Many drivers pair a daily service like grocery or food with a higher-paying weekend service like moving or furniture delivery.",
  },
  {
    q: "What if I don't have a truck or van?",
    a: "Most services only need a sedan or SUV. Trucks and vans unlock the highest-earning categories, but you can start earning today with the vehicle you already own.",
  },
  {
    q: "How does my profile work?",
    a: "When you pick a service, we build a profile tailored to it — highlighting the certifications, equipment, and specialties customers care about for that exact job.",
  },
  {
    q: "When do I get paid?",
    a: "Earnings are shown up front and you can cash out the same day. No guessing, no hidden math.",
  },
];

export default function DriversPage() {
  return (
    <div>
      <JsonLd data={faqLd(FAQ)} />
      <section className="relative overflow-hidden border-b border-border">
        <div className="glow-radial pointer-events-none absolute inset-0" />
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            For drivers
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            Stop renting your time. <span className="text-accent">Build a business.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            FlowSync gives you the tools, the profile, and the pay structure to turn your vehicle
            into a real service business — across whichever deliveries you choose.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/pricing" className="btn-primary w-full rounded-full px-8 py-3.5 text-base sm:w-auto">
              Become a driver
            </Link>
            <Link href="/calculator" className="btn-ghost w-full rounded-full px-8 py-3.5 text-base sm:w-auto">
              Try the quote calculator
            </Link>
          </div>
        </div>
      </section>

      {/* Earnings band */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { v: "92%", l: "of each fare stays with you on a typical job" },
            { v: "$40–75/hr", l: "earning range in moving & hauling" },
            { v: "Same day", l: "cash out on completed jobs" },
          ].map((x, i) => (
            <Reveal key={x.v} delay={i * 80}>
              <div className="card h-full p-8 text-center">
                <p className="text-4xl font-bold text-accent">{x.v}</p>
                <p className="mt-2 text-sm text-muted">{x.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="border-y border-border bg-surface/30">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">FlowSync vs. the usual gig app</h2>
            <p className="mt-4 text-muted">The same work, a fundamentally better deal.</p>
          </Reveal>
          <Reveal className="mt-10">
            <div className="card overflow-hidden">
              <div className="grid grid-cols-3 border-b border-border bg-surface-2 text-sm font-semibold">
                <div className="px-5 py-4 text-muted">&nbsp;</div>
                <div className="px-5 py-4 text-accent">FlowSync</div>
                <div className="px-5 py-4 text-muted">Typical app</div>
              </div>
              {COMPARE.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-3 text-sm ${i % 2 ? "bg-surface" : "bg-surface/40"}`}
                >
                  <div className="px-5 py-4 font-medium">{row.label}</div>
                  <div className="px-5 py-4 text-foreground">{row.flowsync}</div>
                  <div className="px-5 py-4 text-muted">{row.others}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions, answered</h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={i * 50}>
              <details className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                  {item.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-accent transition-transform group-open:rotate-45">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-12 text-center">
            <div className="glow-radial pointer-events-none absolute inset-0" />
            <div className="relative">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to earn on your terms?
              </h2>
              <Link href="/pricing" className="btn-primary mt-7 inline-flex rounded-full px-8 py-3.5 text-base">
                Start your driver profile
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
