import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { serviceFromEnum, docKeyFromKind } from "@/lib/enums";
import { SITE_URL } from "@/lib/site";
import DriverDirectory, { type DirectoryCard } from "@/components/DriverDirectory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find a driver near you",
  description:
    "Browse verified, independent delivery and errand drivers and request a quote directly — grocery, food, furniture, courier, pharmacy, senior errands, moving, and auto parts.",
  alternates: { canonical: `${SITE_URL}/find-a-driver` },
};

export default async function FindADriverPage() {
  // Public directory shows only verified drivers who've picked a primary service.
  // Drivers who skipped service selection at setup aren't listed until they pick one.
  const rows = await prisma.driverProfile.findMany({
    where: { verified: true, primaryService: { not: null } },
    include: { documents: true },
    // Premium first, then newest. The component also re-groups Premium into
    // a "Featured" section visually; ordering here keeps SSR snapshot tidy.
    orderBy: [{ tier: "desc" }, { createdAt: "desc" }],
  });

  const drivers: DirectoryCard[] = [];
  for (const db of rows) {
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

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <DriverDirectory drivers={drivers} />
      </div>
    </div>
  );
}
