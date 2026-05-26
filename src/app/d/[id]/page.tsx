import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dbToAppProfile } from "@/lib/profileMap";
import { serviceFromEnum } from "@/lib/enums";
import { getService } from "@/lib/services";
import { SITE_URL } from "@/lib/site";
import ProfileView from "@/components/ProfileView";
import RequestQuoteButton from "@/components/RequestQuoteButton";

async function fetchProfile(id: string) {
  return prisma.driverProfile.findUnique({
    where: { id },
    include: { documents: true, services: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
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

  return (
    <ProfileView
      profile={profile}
      services={services}
      sidebarCta={
        <RequestQuoteButton driverProfileId={db.id} driverName={`${profile.firstName} ${profile.lastName}`} service={svc?.name ?? "delivery"} />
      }
    />
  );
}
