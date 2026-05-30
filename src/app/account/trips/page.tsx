import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import TripsManager, { type InspectionView } from "@/components/TripsManager";
import type { TripView } from "@/lib/trips";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false },
};

export default async function TripsPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: {
      trips: { orderBy: { date: "desc" }, take: 200 },
      inspections: { orderBy: { date: "desc" }, take: 30 },
    },
  });
  if (!profile) redirect("/account/setup");

  const trips: TripView[] = profile.trips.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    pickupAddress: t.pickupAddress,
    dropoffAddress: t.dropoffAddress,
    earningsCents: t.earningsCents,
    paidMiles: t.paidMiles,
    deadheadMiles: t.deadheadMiles,
    fuelCents: t.fuelCents,
    tollsCents: t.tollsCents,
    otherExpensesCents: t.otherExpensesCents,
    durationMinutes: t.durationMinutes,
    notes: t.notes,
    photos: t.photos,
  }));

  const inspections: InspectionView[] = profile.inspections.map((i) => ({
    id: i.id,
    date: i.date.toISOString(),
    passed: i.passed,
    odometer: i.odometer,
    notes: i.notes,
  }));

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-48" />
      <div className="relative">
        <div className="mx-auto max-w-5xl px-5 pt-6">
          <Link href="/account" className="text-sm text-muted hover:text-foreground">← Account</Link>
        </div>
        <TripsManager trips={trips} inspections={inspections} />
      </div>
    </div>
  );
}
