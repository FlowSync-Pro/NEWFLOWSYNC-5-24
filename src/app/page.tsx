import Link from "next/link";
import { SERVICES } from "@/lib/services";
import ServiceCard from "@/components/ServiceCard";
import ServiceIcon from "@/components/ServiceIcon";
import Reveal from "@/components/Reveal";

const STATS = [
  { value: "8", label: "Service types" },
  { value: "$40+/hr", label: "Top category" },
  { value: "95%", label: "Earnings kept" },
  { value: "24/7", label: "Work on your terms" },
];

const STEPS = [
  {
    n: "01",
    title: "Sign up in minutes",
    body: "Tell us about you and your vehicle. No résumé, no interviews — just a quick verified onboarding.",
  },
  {
    n: "02",
    title: "Pick your service",
    body: "Choose from grocery, food, furniture, courier, pharmacy, senior errands, moving, or auto parts — or stack several.",
  },
  {
    n: "03",
    title: "Get a profile that matches",
    body: "We auto-build a profile tailored to your service so customers know exactly why to choose you.",
  },
  {
    n: "04",
    title: "Earn on your terms",
    body: "Accept jobs nearby, set your rates, and get paid fast. You own the relationship and the business.",
  },
];

const PERKS = [
  {
    title: "Keep more of every job",
    body: "Low flat platform fee instead of steep commissions. The bulk of every fare stays with you.",
  },
  {
    title: "A business, not a gig",
    body: "Build repeat customers and reviews under your own profile — your reputation travels with you.",
  },
  {
    title: "One app, many income streams",
    body: "Slow grocery day? Take a moving job or a courier run. Diversify how you earn.",
  },
  {
    title: "Fast, transparent pay",
    body: "See your earnings up front and cash out the same day. No surprises, no hidden math.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I started with grocery runs and added moving jobs on weekends. FlowSync is the first app where I actually feel like the business is mine.",
    name: "Marcus T.",
    role: "Grocery + Moving · Atlanta",
  },
  {
    quote:
      "The pharmacy profile made me look legit from day one — certifications front and center. Customers request me by name now.",
    name: "Priya R.",
    role: "Pharmacy Delivery · Austin",
  },
  {
    quote:
      "Box truck sitting idle used to cost me money. Now I haul and move through FlowSync and keep almost everything I earn.",
    name: "Devon K.",
    role: "Moving & Hauling · Phoenix",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="glow-radial pointer-events-none absolute inset-0" />
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              The driver-owned delivery marketplace
            </span>
            <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl md:text-7xl">
              <span className="text-gradient">Drive every kind</span>
              <br />
              of delivery, <span className="text-accent">your way.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted">
              From groceries to grand pianos, FlowSync connects you to the work you want.
              Pick your service, build a profile that fits, and keep more of what you earn.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/pricing" className="btn-primary w-full rounded-full px-7 py-3.5 text-base sm:w-auto">
                Become a driver
              </Link>
              <Link href="/services" className="btn-ghost w-full rounded-full px-7 py-3.5 text-base sm:w-auto">
                Explore services
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">
              Need something delivered?{" "}
              <Link href="/find-a-driver" className="font-medium text-accent underline-offset-4 hover:underline">
                Find a driver near you →
              </Link>
            </p>
          </div>

          {/* Service chip row */}
          <div className="no-scrollbar mx-auto mt-14 flex max-w-5xl gap-3 overflow-x-auto pb-2">
            {SERVICES.map((s) => (
              <Link
                key={s.id}
                href={`/services/${s.id}`}
                className="card card-hover flex shrink-0 items-center gap-2.5 px-4 py-2.5"
              >
                <span className="text-accent">
                  <ServiceIcon id={s.id} className="h-5 w-5" />
                </span>
                <span className="whitespace-nowrap text-sm font-medium">{s.short}</span>
              </Link>
            ))}
          </div>

          {/* Stats */}
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-surface px-6 py-7 text-center">
                <p className="text-3xl font-bold text-accent">{s.value}</p>
                <p className="mt-1 text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One platform. Every kind of delivery.
          </h2>
          <p className="mt-4 text-muted">
            Most apps box you into a single job. FlowSync lets you choose — and switch — across eight
            in-demand services.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <Reveal key={s.id} delay={(i % 4) * 70}>
              <ServiceCard service={s} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="overview" className="border-y border-border bg-surface/30">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Up and earning in four steps.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 70}>
                <div className="card h-full p-6">
                  <p className="font-mono text-sm text-accent">{step.n}</p>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why FlowSync */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Why drivers choose us</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Built for drivers who want to own their work.
            </h2>
            <p className="mt-4 text-muted">
              FlowSync flips the gig model. Instead of being a faceless worker taking whatever the
              algorithm hands you, you run a real service business — with your profile, your rates,
              and your reputation.
            </p>
            <Link href="/drivers" className="btn-ghost mt-8 inline-flex rounded-full px-6 py-3 text-sm">
              See driver benefits
            </Link>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {PERKS.map((p, i) => (
              <Reveal key={p.title} delay={i * 70}>
                <div className="card h-full p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3 className="mt-4 font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Drivers are building real businesses.</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <figure className="card flex h-full flex-col p-7">
                  <div className="flex gap-1 text-accent">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <svg key={idx} viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-pretty text-sm leading-relaxed text-foreground/90">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-5 border-t border-border pt-4">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center sm:p-16">
            <div className="glow-radial pointer-events-none absolute inset-0" />
            <div className="relative">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
                Your vehicle. Your service. <span className="text-accent">Your business.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted">
                Join FlowSync today and start earning across the delivery services that fit your life.
              </p>
              <Link href="/pricing" className="btn-primary mt-8 inline-flex rounded-full px-8 py-3.5 text-base">
                Start your driver profile
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
