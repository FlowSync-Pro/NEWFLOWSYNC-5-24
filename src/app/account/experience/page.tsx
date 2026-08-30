import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import DriverExperienceEditor from "@/components/DriverExperienceEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Experience & credentials",
  robots: { index: false },
};

export default async function AccountExperiencePage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: {
      licenses: { orderBy: { uploadedAt: "desc" } },
      trips: { orderBy: { date: "desc" }, take: 60 },
      verifiedLoads: { select: { id: true, rating: true } },
    },
  });
  if (!profile) redirect("/account/setup");

  const rated = profile.verifiedLoads.filter((l) => l.rating != null).length;

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-48" />
      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Experience &amp; credentials</h1>
            <p className="mt-1 text-muted">
              Show customers what you&apos;re qualified for and the work you&apos;ve completed.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/profile" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Preview profile</Link>
            <Link href="/account" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Account</Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xl font-bold">{profile.trips.length}</p>
            <p className="mt-0.5 text-xs text-muted">Deliveries you&apos;ve logged</p>
          </div>
          <div className="card p-4">
            <p className="text-xl font-bold text-accent">{profile.verifiedLoads.length}</p>
            <p className="mt-0.5 text-xs text-muted">Verified by FlowSync</p>
          </div>
          <div className="card p-4">
            <p className="text-xl font-bold text-amber-300">{rated}</p>
            <p className="mt-0.5 text-xs text-muted">Loads rated</p>
          </div>
        </div>

        <div className="mt-8">
          <DriverExperienceEditor
            credentials={profile.licenses.map((c) => ({
              id: c.id,
              kind: c.kind,
              customLabel: c.customLabel,
              blobUrl: c.blobUrl,
              status: c.status,
              expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
            }))}
            trips={profile.trips.map((t) => ({
              tripId: t.id,
              date: t.date.toISOString(),
              route: `${t.pickupAddress} → ${t.dropoffAddress}`,
              photos: t.photos,
              publicPhotos: t.publicPhotos,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
