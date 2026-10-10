import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { serviceFromEnum } from "@/lib/enums";
import { getService } from "@/lib/services";
import { money, sumTrips, tripStats, type TripView } from "@/lib/trips";
import TripMap from "@/components/TripMap";
import AdminDriverExperience from "@/components/AdminDriverExperience";
import AdminReviewInvite from "@/components/AdminReviewInvite";
import AdminFleetToggle from "@/components/AdminFleetToggle";
import AdminStripeConnect from "@/components/AdminStripeConnect";
import AdminPayouts from "@/components/AdminPayouts";
import AdminCurriActivation from "@/components/AdminCurriActivation";
import { connectStatus, syncConnectStatus } from "@/lib/stripe-connect";
import { calendarDay, ptDay } from "@/lib/pt-time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Driver operations", robots: { index: false } };


export default async function AdminDriverOps({ params, searchParams }: PageProps<"/admin/drivers/[id]">) {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const { id } = await params;
  // Arriving from a dispatch load's "Delivered → log payout": pre-fill the form.
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const loadAmountCents = str(sp.loadAmount) && /^\d+$/.test(str(sp.loadAmount)!) ? Number(sp.loadAmount) : undefined;
  const payoutInitial = str(sp.loadId)
    ? { loadId: str(sp.loadId)!, amount: loadAmountCents ? (loadAmountCents / 100).toFixed(2) : "", note: str(sp.loadNote) ?? "", deliveredOn: str(sp.loadDate) ?? "" }
    : undefined;
  const driver = await prisma.driverProfile.findUnique({
    where: { id },
    include: {
      user: { include: { payouts: { orderBy: { createdAt: "desc" }, take: 60 } } },
      trips: { orderBy: { date: "desc" }, take: 200 },
      inspections: { orderBy: { date: "desc" }, take: 30 },
      verifiedLoads: { orderBy: { date: "desc" } },
      licenses: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!driver) notFound();

  // Reviews hang off the user, not the profile.
  const review = await prisma.review.findUnique({
    where: { userId: driver.userId },
    select: { status: true },
  });

  const trips: TripView[] = driver.trips.map((t) => ({
    id: t.id, date: t.date.toISOString(), pickupAddress: t.pickupAddress, dropoffAddress: t.dropoffAddress,
    earningsCents: t.earningsCents, paidMiles: t.paidMiles, deadheadMiles: t.deadheadMiles,
    fuelCents: t.fuelCents, tollsCents: t.tollsCents, otherExpensesCents: t.otherExpensesCents,
    durationMinutes: t.durationMinutes, notes: t.notes, photos: t.photos,
  }));
  const totals = sumTrips(trips);
  const totalMiles = totals.paidMiles + totals.deadheadMiles;
  const name = `${driver.firstName} ${driver.lastName}`.trim();

  // Fleet payouts: mirror Stripe's status for members who have an account
  // (one API call; null when Stripe is unreachable — the stored flags stand in).
  const connect = driver.user.fleetJoinedAt && driver.user.stripeConnectAccountId ? await syncConnectStatus(driver.userId) : null;

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-40" />
      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">← All drivers</Link>
        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{getService(serviceFromEnum(driver.primaryService))?.name}</span>
          {driver.tier === "PREMIUM" && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">★ Premium</span>}
          {driver.user.fleetJoinedAt && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">🚚 Fleet</span>}
        </div>
        <p className="mt-1 text-sm text-muted">
          {driver.user.email}{driver.city ? ` · ${driver.city}` : ""}
          {" · "}<Link href={`/admin/dispute/${driver.userId}`} className="text-accent hover:underline">Dispute evidence</Link>
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Trips" value={String(trips.length)} />
          <Stat label="Total miles" value={totalMiles.toFixed(1)} />
          <Stat label="Deadhead" value={`${Math.round(totalMiles > 0 ? (totals.deadheadMiles / totalMiles) * 100 : 0)}%`} />
          <Stat label="Earnings" value={money(totals.earningsCents)} accent />
          <Stat label="Expenses" value={money(totals.expensesCents)} />
          <Stat label="Net profit" value={money(totals.profitCents)} accent />
        </div>

        {/* Fleet membership — set by the Stripe webhook, or by hand here for
            drivers who paid the joining fee another way. */}
        <div className="mt-6">
          <AdminFleetToggle driverProfileId={driver.id} fleetJoinedAt={driver.user.fleetJoinedAt?.toISOString() ?? null} />
        </div>
        {driver.user.fleetJoinedAt && (
          <div className="mt-3">
            <AdminStripeConnect
              driverProfileId={driver.id}
              status={connect?.status ?? connectStatus(driver.user)}
              accountId={driver.user.stripeConnectAccountId}
              onboardedAt={driver.user.stripeConnectOnboardedAt?.toISOString() ?? null}
              requirementsDue={connect?.requirementsDue ?? []}
            />
          </div>
        )}
        {driver.user.fleetJoinedAt && (
          <div className="mt-3">
            <AdminCurriActivation driverProfileId={driver.id} activatedAt={driver.curriActivatedAt?.toISOString() ?? null} />
          </div>
        )}
        {driver.user.fleetJoinedAt && (
          <div className="mt-3">
            <AdminPayouts
              driverProfileId={driver.id}
              payPlan={driver.user.payPlan}
              initial={payoutInitial}
              connectReady={connect?.payoutsEnabled ?? driver.user.stripeConnectPayoutsEnabled}
              payouts={driver.user.payouts.map((p) => ({
                id: p.id,
                status: p.status,
                loadCents: p.loadCents,
                feePercent: p.feePercent,
                netCents: p.netCents,
                note: p.note,
                deliveredOn: p.deliveredOn.toISOString(),
                paidAt: p.paidAt?.toISOString() ?? null,
                failureReason: p.failureReason,
              }))}
            />
          </div>
        )}

        {/* Review invite — the only way a driver gets to leave a review */}
        <div className="mt-6">
          <AdminReviewInvite
            driverProfileId={driver.id}
            driverFirstName={driver.firstName}
            reviewStatus={review?.status ?? null}
            verifiedLoadCount={driver.verifiedLoads.length}
          />
        </div>

        {/* Experience: verified loads, ratings, credentials */}
        <h2 className="mt-8 text-lg font-semibold">Experience &amp; credentials</h2>
        <div className="mt-3">
          <AdminDriverExperience
            driverProfileId={driver.id}
            loggedTripCount={trips.length}
            loads={driver.verifiedLoads.map((l) => ({
              id: l.id,
              date: l.date.toISOString(),
              pickupCity: l.pickupCity,
              dropoffCity: l.dropoffCity,
              loadType: l.loadType,
              rating: l.rating,
              publicNote: l.publicNote,
              adminNote: l.adminNote,
              photos: l.photos,
              photosPublic: l.photosPublic,
            }))}
            licenses={driver.licenses.map((c) => ({
              id: c.id,
              kind: c.kind,
              customLabel: c.customLabel,
              blobUrl: c.blobUrl,
              status: c.status,
              expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
            }))}
          />
        </div>

        {/* Inspections */}
        <h2 className="mt-8 text-lg font-semibold">Pre-trip inspections</h2>
        {driver.inspections.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None logged.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {driver.inspections.map((i) => (
              <div key={i.id} className="card flex items-center justify-between p-4 text-sm">
                <span>{ptDay(i.date)}{i.odometer ? ` · ${i.odometer.toLocaleString()} mi` : ""}{i.notes ? ` · ${i.notes}` : ""}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${i.passed ? "bg-accent text-[#04130a]" : "bg-red-500/20 text-red-300"}`}>{i.passed ? "Passed" : "Issues"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Trips */}
        <h2 className="mt-8 text-lg font-semibold">Trips</h2>
        {trips.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No trips logged.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {trips.map((t) => {
              const s = tripStats(t);
              return (
                <div key={t.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.pickupAddress} → {t.dropoffAddress}</p>
                      <p className="text-xs text-muted">{calendarDay(t.date)} · {s.totalMiles.toFixed(1)} mi ({t.deadheadMiles.toFixed(1)} deadhead) · {Math.floor(t.durationMinutes / 60)}h {t.durationMinutes % 60}m</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${s.profitCents >= 0 ? "text-accent" : "text-red-400"}`}>{money(s.profitCents)}</p>
                      <p className="text-xs text-muted">{money(t.earningsCents)} earned</p>
                    </div>
                  </div>
                  <div className="mt-3"><TripMap pickup={t.pickupAddress} dropoff={t.dropoffAddress} /></div>
                  {t.notes && <p className="mt-3 text-sm text-muted">{t.notes}</p>}
                  {t.photos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {t.photos.map((p, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt="Delivery" className="h-20 w-20 rounded-lg border border-border object-cover" /></a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className={`text-xl font-bold ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
