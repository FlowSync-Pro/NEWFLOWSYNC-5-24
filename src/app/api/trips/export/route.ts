import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { exportRange, tripsToCsv } from "@/lib/trips-csv";

// "Download my trips": the signed-in driver's OWN trip log as a CSV file
// (src/lib/trips-csv.ts). Any signed-in driver, Premium or not — it's their
// own data (owner decision 2026-10-15). Read-only; the only query parameter is
// the year, never anything personal. Photos are left out.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (session.mustResetPassword) return NextResponse.json({ error: "Set your password first." }, { status: 403 });

  const range = exportRange(new URL(req.url).searchParams.get("year"));
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });

  const profile = await prisma.driverProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "No driver profile yet." }, { status: 404 });

  const trips = await prisma.trip.findMany({
    where: {
      driverProfileId: profile.id,
      ...(range.from && range.to ? { date: { gte: range.from, lt: range.to } } : {}),
    },
    orderBy: { date: "asc" },
    select: {
      date: true, pickupAddress: true, dropoffAddress: true, earningsCents: true, paidMiles: true, deadheadMiles: true,
      fuelCents: true, tollsCents: true, otherExpensesCents: true, durationMinutes: true, notes: true,
    },
  });

  return new NextResponse(tripsToCsv(trips), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="flowsync-trips-${range.label}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
