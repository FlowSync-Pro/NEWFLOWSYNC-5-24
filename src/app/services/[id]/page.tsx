import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SERVICES, getService, type Service } from "@/lib/services";
import { SITE_URL } from "@/lib/site";
import ServiceIcon from "@/components/ServiceIcon";
import JsonLd, { breadcrumbLd, faqLd } from "@/components/JsonLd";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/services/[id]">): Promise<Metadata> {
  const { id } = await params;
  const s = getService(id);
  if (!s) return {};
  const title = `${s.name} — become a ${s.profileHeadline}`;
  return {
    title,
    description: s.description,
    alternates: { canonical: `${SITE_URL}/services/${s.id}` },
    openGraph: { type: "website", title, description: s.description, url: `${SITE_URL}/services/${s.id}` },
  };
}

function serviceFaqs(s: Service): { q: string; a: string }[] {
  return [
    {
      q: `What vehicle do I need for ${s.name.toLowerCase()}?`,
      a: `Typically a ${s.vehicle.toLowerCase()}. You can confirm your exact vehicle when you build your profile.`,
    },
    {
      q: `How much can I earn doing ${s.short.toLowerCase()} on FlowSync?`,
      a: `Drivers in this category typically earn ${s.earnings}. On FlowSync you set your own quote on every job — there are no monthly fees, just a platform fee on jobs you book.`,
    },
    {
      q: `What does ${s.short.toLowerCase()} work involve?`,
      a: `${s.tasks.slice(0, 3).join("; ")}.`,
    },
    {
      q: `How do I start offering ${s.short.toLowerCase()}?`,
      a: `Create your driver profile, choose "${s.name}", and get listed in the FlowSync directory for a one-time $17. Customers can then book you directly.`,
    },
  ];
}

export default async function ServiceDetailPage({ params }: PageProps<"/services/[id]">) {
  const { id } = await params;
  const s = getService(id);
  if (!s) notFound();

  const faqs = serviceFaqs(s);
  const related = SERVICES.filter((x) => x.id !== s.id).slice(0, 3);

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    serviceType: s.name,
    description: s.description,
    areaServed: "US",
    provider: { "@type": "Organization", name: "FlowSync", url: SITE_URL },
    offers: { "@type": "Offer", priceCurrency: "USD", price: "17", description: "One-time driver listing" },
  };

  return (
    <div>
      <JsonLd data={serviceLd} />
      <JsonLd data={breadcrumbLd([{ name: "Services", path: "/services" }, { name: s.name, path: `/services/${s.id}` }])} />
      <JsonLd data={faqLd(faqs)} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="glow-radial pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-5xl px-5 py-16">
          <nav className="flex items-center gap-2 text-sm text-muted">
            <Link href="/services" className="hover:text-foreground">Services</Link>
            <span>/</span>
            <span className="text-foreground">{s.short}</span>
          </nav>

          <div className="mt-6 flex items-start gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <ServiceIcon id={s.id} className="h-8 w-8" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">{s.demand} demand</p>
              <h1 className="mt-1 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{s.name}</h1>
              <p className="mt-2 text-lg text-accent">{s.tagline}</p>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-muted">{s.description}</p>

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

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href={`/signup?service=${s.id}`} className="btn-primary rounded-full px-7 py-3 text-sm">
              Sign up for {s.short}
            </Link>
            <Link href="/find-a-driver" className="btn-ghost rounded-full px-7 py-3 text-sm">
              Find a {s.short.toLowerCase()} driver
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-14">
        {/* Tasks + requirements */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold">What you&apos;ll do</h2>
            <ul className="mt-4 space-y-2.5">
              {s.tasks.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm text-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold">What you&apos;ll need</h2>
            <ul className="mt-4 space-y-2.5">
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

        {/* Profile match */}
        <div className="card mt-5 p-7">
          <h2 className="text-lg font-semibold">Your profile, matched to {s.short.toLowerCase()}</h2>
          <p className="mt-2 text-muted">
            When you choose {s.name}, FlowSync builds a profile that highlights exactly what these
            customers look for — your <strong className="text-foreground">{s.profileSectionTitle.toLowerCase()}</strong>.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {s.profileFields.flatMap((f) => f.suggestions ?? []).slice(0, 6).map((sug) => (
              <span key={sug} className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm text-muted">
                {sug}
              </span>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Frequently asked</h2>
          <div className="mt-5 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-accent transition-transform group-open:rotate-45">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Related */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Other services</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.id} href={`/services/${r.id}`} className="card card-hover flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <ServiceIcon id={r.id} className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{r.short}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
