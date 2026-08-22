import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PayButton from "@/components/PayButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pay your quote",
  robots: { index: false },
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function BookingPayPage({ params }: PageProps<"/book/[id]/pay">) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { driverProfile: true },
  });
  if (!booking) notFound();

  const driverName = `${booking.driverProfile.firstName} ${booking.driverProfile.lastName}`.trim();
  const paid = booking.status === "PAID" || booking.status === "COMPLETED";

  return (
    <div className="relative min-h-[70vh]">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto flex max-w-md flex-col px-5 py-20">
        <div className="card p-7 text-center">
          {paid ? (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-7 w-7">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h1 className="mt-4 text-2xl font-bold">Payment complete</h1>
              <p className="mt-2 text-muted">Thanks! {driverName} has been notified and will be in touch.</p>
              <Link href="/find-a-driver" className="btn-ghost mt-6 inline-flex rounded-full px-6 py-2.5 text-sm">Find more drivers</Link>
            </>
          ) : booking.status === "QUOTED" && booking.quoteAmount != null ? (
            <>
              <p className="text-sm text-muted">Your quote from {driverName}</p>
              <p className="mt-2 text-5xl font-extrabold text-accent">{money(booking.quoteAmount)}</p>
              <p className="mx-auto mt-3 max-w-xs text-sm text-muted">{booking.details}</p>
              <div className="mt-6">
                <PayButton bookingId={booking.id} label={`Pay ${money(booking.quoteAmount)}`} />
              </div>
              <p className="mt-3 text-xs text-muted">Secure checkout. You&apos;re paying {driverName} directly.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">No quote yet</h1>
              <p className="mt-2 text-muted">{driverName} hasn&apos;t sent a quote for this request yet. You&apos;ll get an email as soon as they do.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
