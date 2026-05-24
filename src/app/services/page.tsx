import Link from "next/link";
import type { Metadata } from "next";
import { SERVICES } from "@/lib/services";
import ServiceIcon from "@/components/ServiceIcon";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Services — FlowSync",
  description:
    "Explore the eight delivery and errand services you can offer on FlowSync, from grocery and food to moving, pharmacy, and auto parts.",
};

export default function ServicesPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="glow-radial pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Services</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Eight ways to earn. Pick one, or stack them all.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted">
            Every service below comes with a profile template designed to win that exact kind of customer.
            Choose what fits your vehicle and your schedule.
          </p>
        </div>
      </section>

      {/* Quick nav */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3">
          {SERVICES.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-accent/60 hover:text-foreground"
            >
              <ServiceIcon id={s.id} className="h-4 w-4" />
              {s.short}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="space-y-6">
          {SERVICES.map((s, i) => (
            <Reveal key={s.id}>
              <section
                id={s.id}
                className="card scroll-mt-32 overflow-hidden p-7 sm:p-9"
              >
                <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
                  <div>
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                        <ServiceIcon id={s.id} className="h-7 w-7" />
                      </span>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted">
                          {String(i + 1).padStart(2, "0")} · {s.demand} demand
                        </p>
                        <h2 className="text-2xl font-bold tracking-tight">{s.name}</h2>
                      </div>
                    </div>
                    <p className="mt-5 text-lg text-accent">{s.tagline}</p>
                    <p className="mt-2 text-muted">{s.description}</p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                        <p className="text-xs text-muted">Typical vehicle</p>
                        <p className="text-sm font-semibold">{s.vehicle}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                        <p className="text-xs text-muted">Earnings</p>
                        <p className="text-sm font-semibold text-accent">{s.earnings}</p>
                      </div>
                    </div>

                    <Link
                      href={`/signup?service=${s.id}`}
                      className="btn-primary mt-7 inline-flex rounded-full px-6 py-3 text-sm"
                    >
                      Sign up for {s.short}
                    </Link>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-surface-2 p-5">
                      <h3 className="text-sm font-semibold">What you&apos;ll do</h3>
                      <ul className="mt-3 space-y-2">
                        {s.tasks.map((t) => (
                          <li key={t} className="flex gap-2.5 text-sm text-muted">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface-2 p-5">
                      <h3 className="text-sm font-semibold">What you&apos;ll need</h3>
                      <ul className="mt-3 space-y-2">
                        {s.requirements.map((r) => (
                          <li key={r} className="flex gap-2.5 text-sm text-muted">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="mt-0.5 h-4 w-4 shrink-0 text-accent">
                              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12">
          <div className="card flex flex-col items-center justify-between gap-5 p-8 text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="text-xl font-bold">Not sure which to start with?</h3>
              <p className="mt-1 text-muted">Begin the signup and we&apos;ll recommend services that match your vehicle.</p>
            </div>
            <Link href="/signup" className="btn-primary shrink-0 rounded-full px-7 py-3.5 text-sm">
              Become a driver
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
