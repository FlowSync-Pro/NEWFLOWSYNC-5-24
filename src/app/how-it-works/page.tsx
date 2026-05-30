import Link from "next/link";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import { SERVICES } from "@/lib/services";
import ServiceIcon from "@/components/ServiceIcon";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "How it works — FlowSync",
  description:
    "From signup to your first job in four steps. See how FlowSync builds a service-matched profile and connects you to nearby work.",
  alternates: { canonical: `${SITE_URL}/how-it-works` },
};

const STEPS = [
  {
    n: "01",
    title: "Get listed for $17",
    body: "Choose a plan and pay the one-time listing fee, then add a few details about you and your vehicle. We verify your identity and license so customers can trust you from day one.",
    points: ["No interviews or résumé", "Quick identity & vehicle check", "$17 one-time — no monthly fees"],
  },
  {
    n: "02",
    title: "Choose your service(s)",
    body: "Select from eight categories. Your vehicle suggests the best fits — a sedan unlocks grocery and pharmacy, a box truck unlocks moving and furniture.",
    points: ["Stack multiple services", "Vehicle-aware recommendations", "Switch anytime"],
  },
  {
    n: "03",
    title: "We build your profile",
    body: "FlowSync generates a profile tailored to your service — surfacing the certifications, equipment, and specialties that win that exact kind of customer.",
    points: ["Service-matched layout", "Highlights your strengths", "Edit it whenever you like"],
  },
  {
    n: "04",
    title: "Accept jobs & get paid",
    body: "See nearby requests, accept what fits your day, and cash out the same day. Build reviews and repeat customers under your own name.",
    points: ["Transparent up-front pay", "Same-day cash out", "Keep your customer relationships"],
  },
];

export default function HowItWorksPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="glow-radial pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">How it works</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            From signup to your first job in four steps.
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="space-y-5">
          {STEPS.map((s) => (
            <Reveal key={s.n}>
              <div className="card grid gap-6 p-8 sm:grid-cols-[auto_1fr]">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft font-mono text-xl font-bold text-accent">
                  {s.n}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{s.title}</h2>
                  <p className="mt-2 text-muted">{s.body}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {s.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3.5 w-3.5 text-accent">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Profile-matching explainer */}
      <section className="border-y border-border bg-surface/30">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your profile adapts to your service.
            </h2>
            <p className="mt-4 text-muted">
              The same driver, three different services, three purpose-built profiles. Customers
              instantly see why you&apos;re right for the job.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[SERVICES[0], SERVICES[4], SERVICES[6]].map((s) => (
              <Reveal key={s.id}>
                <div className="card p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <ServiceIcon id={s.id} className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-semibold">{s.profileHeadline}</h3>
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted">{s.profileSectionTitle}</p>
                  <ul className="mt-4 space-y-2">
                    {s.profileFields.flatMap((f) => f.suggestions?.slice(0, 2) ?? []).map((sug) => (
                      <li key={sug} className="flex gap-2 text-sm text-muted">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {sug}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 text-center">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">See it for yourself.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Run through the signup and watch your service-matched profile come together in real time.
          </p>
          <Link href="/pricing" className="btn-primary mt-8 inline-flex rounded-full px-8 py-3.5 text-base">
            Become a driver
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
