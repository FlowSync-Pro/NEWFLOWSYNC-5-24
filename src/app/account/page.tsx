import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { serviceFromEnum, docKeyFromKind } from "@/lib/enums";
import AccountEditor from "@/components/AccountEditor";
import type { DocKey, DriverProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit your account",
  description: "Update your driver profile, upload your documents, and get verified on FlowSync.",
  robots: { index: false },
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const db = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: { documents: true },
  });
  if (!db) redirect("/signin");

  const documents: Partial<Record<DocKey, string>> = {};
  for (const d of db.documents) documents[docKeyFromKind(d.kind)] = d.blobUrl;

  const initial: DriverProfile = {
    firstName: db.firstName,
    lastName: db.lastName,
    email: "",
    phone: db.phone ?? "",
    city: db.city ?? "",
    primaryService: serviceFromEnum(db.primaryService),
    additionalServices: db.additionalServices.map(serviceFromEnum),
    vehicleType: db.vehicleType ?? "",
    vehicleMakeModel: db.vehicleMakeModel ?? "",
    vehicleYear: db.vehicleYear ?? "",
    headline: db.headline ?? "",
    bio: db.bio ?? "",
    hourlyRate: db.hourlyRate?.toString() ?? "",
    yearsExperience: db.yearsExperience?.toString() ?? "",
    serviceRadius: db.serviceRadius ?? "",
    availability: db.availability,
    languages: db.languages,
    serviceDetails: (db.serviceDetails as Record<string, string | string[]>) ?? {},
    documents,
  };

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <AccountEditor initial={initial} />
      </div>
    </div>
  );
}
