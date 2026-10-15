import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import TripsManager, { type InspectionView } from "@/components/TripsManager";
import type { TripView } from "@/lib/trips";
import { getEntitlements, hasProAccess } from "@/lib/access";
import ProGate from "@/components/ProGate";
import TripDownload from "@/components/TripDownload";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false },
};

/** Years offered by "Download my trips": the first trip's year through this year; none without trips. */
async function tripExportYears(driverProfileId: string): Promise<number[]> {
  const first = await prisma.trip.findFirst({ where: { driverProfileId }, orderBy: { date: "asc" }, select: { date: true } });
  if (!first) return [];
  const thisYear = new Date().getUTCFullYear();
  const startYear = Math.min(first.date.getUTCFullYear(), thisYear);
  return Array.from({ length: thisYear - startYear + 1 }, (_, i) => thisYear - i);
}

export default async function TripsPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  // The business P&L tracker (trips, mileage, expenses, cost per mile) is a
  // Premium tool. Drivers who bought before the funnel change keep it (legacy);
  // their logged data is never touched either way — only the page is gated.
  // Any driver can still download the trips they saved (owner decision 2026-10-15).
  const ent = await getEntitlements();
  if (!hasProAccess(ent)) {
    const own = await prisma.driverProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
    const years = own ? await tripExportYears(own.id) : [];
    return (
      <>
        {years.length > 0 && (
          <div className="mx-auto max-w-2xl px-5 pt-10">
            <TripDownload years={years} />
          </div>
        )}
        <ProGate
          title="The business P&L tracker is part of Premium"
          blurb="Log every trip, split business and personal expenses, and see your cost per mile, rate per mile, and net income by week, month, and quarter."
        />
      </>
    );
  }

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: {
      trips: { orderBy: { date: "desc" }, take: 200 },
      inspections: { orderBy: { date: "desc" }, take: 30 },
    },
  });
  if (!profile) redirect("/account/setup");

  const exportYears = await tripExportYears(profile.id);

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
        <TripsManager trips={trips} inspections={inspections} exportYears={exportYears} />
      </div>
    </div>
  );
}
