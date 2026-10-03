import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { serviceFromEnum, docKeyFromKind } from "@/lib/enums";
import { SITE_URL } from "@/lib/site";
import { cardExperience } from "@/lib/experience";
import { getService } from "@/lib/services";
import { cityIndex } from "@/lib/locations";
import DriverDirectory, { type DirectoryCard } from "@/components/DriverDirectory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find a driver near you",
  description:
    "Browse verified, independent delivery and errand drivers by location and service, and request a quote directly — grocery, food, furniture, courier, pharmacy, senior errands, moving, and auto parts.",
  alternates: { canonical: `${SITE_URL}/find-a-driver` },
};

export default async function FindADriverPage() {
  // Public directory shows only verified drivers who've picked a primary service.
  // Drivers who skipped service selection at setup aren't listed until they pick one.
  const rows = await prisma.driverProfile.findMany({
    where: { verified: true, primaryService: { not: null } },
    include: {
      documents: true,
      // Only what the card needs: ratings for the average, credentials for
      // the badges. Same public-safety rules as the profile page apply in
      // cardExperience() (rating gated on 3+ loads, credentials must be
      // verified and unexpired).
      verifiedLoads: { select: { rating: true } },
      licenses: { select: { kind: true, customLabel: true, status: true, expiresAt: true } },
    },
    // Premium first, then newest. The component also re-groups Premium into
    // a "Featured" section visually; ordering here keeps SSR snapshot tidy.
    orderBy: [{ tier: "desc" }, { createdAt: "desc" }],
  });

  const drivers: DirectoryCard[] = [];
  for (const db of rows) {
    const service = serviceFromEnum(db.primaryService);
    if (!service) continue;
    const xp = cardExperience({ verifiedLoads: db.verifiedLoads, licenses: db.licenses });
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
      rating: xp.rating,
      credentials: xp.credentials,
    });
  }

  // Links to the /delivery/[service]/[city] pages — the only internal links
  // Google gets to them. Empty until drivers add a city, then grows on its own.
  const cities = await cityIndex();

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <DriverDirectory drivers={drivers} />
      </div>

      {cities.length > 0 && (
        <section className="relative mx-auto max-w-5xl px-5 pb-20">
          <h2 className="text-xl font-bold">Browse by city</h2>
          <p className="mt-1 text-sm text-muted">Verified drivers, by city and service.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c) => (
              <div key={c.slug} className="card p-5">
                <h3 className="font-semibold">{c.city}</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {c.services.map((s) => {
                    const id = serviceFromEnum(s.serviceEnum as never);
                    const svc = id ? getService(id) : undefined;
                    if (!id || !svc) return null;
                    return (
                      <li key={s.serviceEnum}>
                        <Link href={`/delivery/${id}/${c.slug}`} className="text-accent hover:text-foreground">
                          {`${svc.name} in ${c.city}`}
                        </Link>
                        <span className="text-muted">{` · ${s.count} driver${s.count === 1 ? "" : "s"}`}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
