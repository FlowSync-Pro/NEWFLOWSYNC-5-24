import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dbToAppProfile } from "@/lib/profileMap";
import { serviceFromEnum } from "@/lib/enums";
import { getService } from "@/lib/services";
import { SITE_URL } from "@/lib/site";
import { buildProfileExperience } from "@/lib/experience";
import ProfileView from "@/components/ProfileView";
import RequestQuoteButton from "@/components/RequestQuoteButton";

async function fetchProfile(id: string) {
  // Verified + has chosen a primary service (otherwise the profile has no
  // service category to render publicly — they're listed as soon as they pick).
  return prisma.driverProfile.findFirst({
    where: { id, verified: true, primaryService: { not: null } },
    include: {
      documents: true,
      services: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      // Only the opt-in photo list is selected — a driver's private delivery
      // photos are never loaded into a public page.
      trips: { select: { publicPhotos: true } },
      verifiedLoads: { orderBy: { date: "desc" } },
      licenses: true,
      _count: { select: { trips: true } },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/d/[id]">): Promise<Metadata> {
  const { id } = await params;
  const db = await fetchProfile(id);
  if (!db) return {};
  const svc = getService(serviceFromEnum(db.primaryService));
  const name = `${db.firstName} ${db.lastName}`.trim();
  const title = `${name} — ${svc?.profileHeadline ?? "FlowSync driver"}`;
  return {
    title,
    description: db.bio ?? `Book ${name} on FlowSync for ${svc?.name.toLowerCase() ?? "delivery"} in ${db.city ?? "your area"}.`,
    alternates: { canonical: `${SITE_URL}/d/${db.id}` },
  };
}

export default async function PublicProfilePage({ params }: PageProps<"/d/[id]">) {
  const { id } = await params;
  const db = await fetchProfile(id);
  if (!db) notFound();

  const profile = dbToAppProfile(db);
  const svc = getService(profile.primaryService);
  const services = db.services.map((s) => ({ id: s.id, name: s.name, description: s.description, priceCents: s.priceCents }));

  const experience = buildProfileExperience({
    trips: db.trips,
    verifiedLoads: db.verifiedLoads,
    licenses: db.licenses,
    loggedTripCount: db._count.trips,
  });

  return (
    <ProfileView
      profile={profile}
      services={services}
      experience={experience}
      sidebarCta={
        <RequestQuoteButton driverProfileId={db.id} driverName={`${profile.firstName} ${profile.lastName}`} service={svc?.name ?? "delivery"} />
      }
    />
  );
}
