import Link from "next/link";
import type { Metadata } from "next";
import { SERVICES } from "@/lib/services";
import { SITE_URL } from "@/lib/site";
import ServiceCard from "@/components/ServiceCard";
import ServiceIcon from "@/components/ServiceIcon";
import Reveal from "@/components/Reveal";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Services — eight ways to earn",
  description:
    "Explore the eight delivery and errand services you can offer on FlowSync — grocery, food, furniture, courier, pharmacy, senior errands, moving, and auto parts — with typical vehicles and earnings.",
  alternates: { canonical: `${SITE_URL}/services` },
};

export default function ServicesPage() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: SERVICES.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: `${SITE_URL}/services/${s.id}`,
    })),
  };

  return (
    <div>
      <JsonLd data={itemListLd} />

      <section className="relative overflow-hidden border-b border-border">
        <div className="glow-radial pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Services</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Eight ways to earn. Pick one, or stack them all.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted">
            Every service comes with a profile template designed to win that exact kind of customer.
            Choose what fits your vehicle and your schedule.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <Reveal key={s.id} delay={(i % 4) * 60}>
              <ServiceCard service={s} />
            </Reveal>
          ))}
        </div>

        {/* Vehicle reference table */}
        <Reveal className="mt-14">
          <div className="card overflow-hidden">
            <div className="border-b border-border bg-surface-2 px-6 py-4">
              <h2 className="font-semibold">Service & typical vehicle</h2>
            </div>
            <div className="divide-y divide-border">
              {SERVICES.map((s) => (
                <Link
                  key={s.id}
                  href={`/services/${s.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-surface-2"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <ServiceIcon id={s.id} className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium">{s.name}</span>
                  </span>
                  <span className="hidden text-sm text-muted sm:block">{s.vehicle}</span>
                  <span className="text-sm font-semibold text-accent">{s.earnings}</span>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-12">
          <div className="card flex flex-col items-center justify-between gap-5 p-8 text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="text-xl font-bold">Not sure which to start with?</h3>
              <p className="mt-1 text-muted">Begin the signup and we&apos;ll recommend services that match your vehicle.</p>
            </div>
            <Link href="/pricing" className="btn-primary shrink-0 rounded-full px-7 py-3.5 text-sm">
              Become a driver
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
