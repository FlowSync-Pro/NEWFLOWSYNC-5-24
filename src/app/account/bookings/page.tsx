import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { serviceFromEnum } from "@/lib/enums";
import { getService } from "@/lib/services";
import BookingsList, { type BookingRow } from "@/components/BookingsList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your bookings",
  robots: { index: false },
};

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const profile = await prisma.driverProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) redirect("/account/setup");

  const rows = await prisma.booking.findMany({
    where: { driverProfileId: profile.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  const bookings: BookingRow[] = rows.map((b) => ({
    id: b.id,
    customerName: b.customer.name ?? "Customer",
    status: b.status,
    details: b.details,
    service: getService(serviceFromEnum(b.service))?.name ?? "Delivery",
    quoteAmount: b.quoteAmount,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-60" />
      <div className="relative mx-auto max-w-3xl px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your bookings</h1>
            <p className="mt-1 text-muted">Review requests and send quotes. You keep 95% of every paid job.</p>
          </div>
          <Link href="/account" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Account</Link>
        </div>
        <BookingsList bookings={bookings} />
      </div>
    </div>
  );
}
