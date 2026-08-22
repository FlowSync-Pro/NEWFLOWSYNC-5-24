import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { serviceFromEnum, serviceToEnum, docKeyFromKind } from "@/lib/enums";
import { getService, type ServiceId } from "@/lib/services";
import { SITE_URL } from "@/lib/site";
import { citySlug, cityDisplay } from "@/lib/locations";
import DriverDirectory, { type DirectoryCard } from "@/components/DriverDirectory";
import JsonLd, { breadcrumbLd } from "@/components/JsonLd";

export const dynamic = "force-dynamic";

const SERVICE_IDS: ServiceId[] = [
  "grocery", "food", "furniture", "courier", "pharmacy", "senior", "moving", "auto-parts",
];

/** Load verified drivers for this service whose city slug matches. */
async function load(serviceId: ServiceId, citySlugParam: string) {
  const rows = await prisma.driverProfile.findMany({
    where: { verified: true, primaryService: serviceToEnum(serviceId), city: { not: null } },
    include: { documents: true },
    // Premium first, then newest — the directory groups them into a
    // "Featured" section above the rest.
    orderBy: [{ tier: "desc" }, { createdAt: "desc" }],
  });
  const matched = rows.filter((r) => citySlug(r.city ?? "") === citySlugParam);
  const cityName = matched[0]?.city ? cityDisplay(matched[0].city) : cityDisplay(citySlugParam.replace(/-/g, " "));
  return { matched, cityName };
}

export async function generateMetadata({ params }: PageProps<"/delivery/[service]/[city]">): Promise<Metadata> {
  const { service, city } = await params;
  const svc = getService(service);
  if (!svc || !SERVICE_IDS.includes(service as ServiceId)) return {};
  const { matched, cityName } = await load(service as ServiceId, city);
  if (matched.length === 0) return {};
  const title = `${svc.name} in ${cityName} — book a local driver`;
  const description = `Find verified independent ${svc.name.toLowerCase()} drivers in ${cityName}. Browse local drivers, see their rates, and request a quote directly from the driver — no middleman markup.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/delivery/${service}/${city}` },
    openGraph: { type: "website", title, description, url: `${SITE_URL}/delivery/${service}/${city}` },
  };
}

export default async function CityServicePage({ params }: PageProps<"/delivery/[service]/[city]">) {
  const { service, city } = await params;
  const svc = getService(service);
  if (!svc || !SERVICE_IDS.includes(service as ServiceId)) notFound();

  const { matched, cityName } = await load(service as ServiceId, city);
  // No real drivers here yet → don't publish a thin page.
  if (matched.length === 0) notFound();

  const drivers: DirectoryCard[] = [];
  for (const db of matched) {
    // primaryService is guaranteed by the query above, but narrow for the type.
    const service = serviceFromEnum(db.primaryService);
    if (!service) continue;
    drivers.push({
      id: db.id,
      name: `${db.firstName} ${db.lastName}`.trim(),
      service,
      city: db.city ?? "",
      rate: db.hourlyRate ?? null,
      verified: db.verified,
      headline: db.headline ?? "",
      photoUrl: db.documents.find((d) => docKeyFromKind(d.kind) === "profilePhoto")?.blobUrl,
      tier: db.tier,
    });
  }

  const ld = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: svc.name,
    areaServed: { "@type": "City", name: cityName },
    provider: { "@type": "Organization", name: "FlowSync", url: SITE_URL },
    description: `Independent ${svc.name.toLowerCase()} drivers serving ${cityName}.`,
  };

  return (
    <div className="relative">
      <JsonLd data={ld} />
      <JsonLd data={breadcrumbLd([
        { name: "Find a driver", path: "/find-a-driver" },
        { name: svc.name, path: `/services/${svc.id}` },
        { name: cityName, path: `/delivery/${service}/${city}` },
      ])} />
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />

      <section className="relative mx-auto max-w-5xl px-5 pt-14 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">{cityName}</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          {svc.name} in {cityName}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-muted">
          Book a verified, independent {svc.name.toLowerCase()} driver in {cityName}. These are local
          drivers who own their business and quote you directly — so you get fair prices and
          someone who actually cares about your delivery.
        </p>
        <p className="mt-4 text-sm text-muted">
          {drivers.length} verified driver{drivers.length === 1 ? "" : "s"} serving {cityName}
        </p>
      </section>

      <div className="relative">
        <DriverDirectory drivers={drivers} />
      </div>

      {/* Driver-side CTA — these pages also recruit drivers in cities with demand */}
      <section className="relative mx-auto max-w-5xl px-5 pb-20">
        <div className="card flex flex-col items-center justify-between gap-4 p-7 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-lg font-bold">Drive {svc.name.toLowerCase()} in {cityName}?</h2>
            <p className="mt-1 text-sm text-muted">Get listed here and start taking direct bookings — you set your own rates.</p>
          </div>
          <Link href="/pricing" className="btn-primary shrink-0 rounded-full px-7 py-3 text-sm">Get listed for $17</Link>
        </div>
      </section>
    </div>
  );
}
