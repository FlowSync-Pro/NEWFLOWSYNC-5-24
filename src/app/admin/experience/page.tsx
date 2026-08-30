import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import {
  averageRating,
  ratedCount,
  formatRating,
  licenseLabel,
  publicCredentials,
  MIN_RATINGS_FOR_PUBLIC,
} from "@/lib/experience";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Driver experience & ratings", robots: { index: false } };

export default async function AdminExperiencePage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const drivers = await prisma.driverProfile.findMany({
    include: {
      user: { select: { email: true } },
      verifiedLoads: { select: { rating: true, date: true } },
      licenses: { select: { kind: true, customLabel: true, status: true, expiresAt: true } },
      _count: { select: { trips: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = drivers
    .map((d) => {
      const avg = averageRating(d.verifiedLoads);
      const rated = ratedCount(d.verifiedLoads);
      const lastLoad = d.verifiedLoads
        .map((l) => l.date.getTime())
        .sort((a, b) => b - a)[0];
      return {
        id: d.id,
        name: `${d.firstName} ${d.lastName}`.trim() || d.user.email,
        city: d.city,
        tier: d.tier,
        verifiedLoads: d.verifiedLoads.length,
        loggedTrips: d._count.trips,
        avg,
        rated,
        credentials: publicCredentials(d.licenses),
        pendingCreds: d.licenses.filter((c) => c.status === "PENDING").length,
        lastLoad: lastLoad ? new Date(lastLoad) : null,
      };
    })
    // Most experienced first — that's the ranking a shipper cares about.
    .sort((a, b) => b.verifiedLoads - a.verifiedLoads || (b.avg ?? 0) - (a.avg ?? 0));

  const maxLoads = Math.max(1, ...rows.map((r) => r.verifiedLoads));
  const totalVerified = rows.reduce((s, r) => s + r.verifiedLoads, 0);
  const totalPendingCreds = rows.reduce((s, r) => s + r.pendingCreds, 0);
  const ratedDrivers = rows.filter((r) => r.rated > 0);
  const fleetAvg =
    ratedDrivers.length > 0
      ? ratedDrivers.reduce((s, r) => s + (r.avg ?? 0), 0) / ratedDrivers.length
      : null;

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-40" />
      <div className="relative mx-auto max-w-5xl px-5 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin dashboard</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Driver experience &amp; ratings</h1>
        <p className="mt-1 text-muted">Verified loads you&apos;ve recorded, driver ratings, and credential status.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Verified loads" value={String(totalVerified)} accent />
          <Stat label="Fleet avg rating" value={fleetAvg === null ? "—" : `★ ${formatRating(fleetAvg)}`} />
          <Stat label="Drivers rated" value={String(ratedDrivers.length)} />
          <Stat label="Credentials to review" value={String(totalPendingCreds)} warn={totalPendingCreds > 0} />
        </div>

        <div className="mt-8 space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted">No drivers yet.</p>}
          {rows.map((r) => (
            <Link key={r.id} href={`/admin/drivers/${r.id}`} className="card card-hover block p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{r.name}</p>
                    {r.tier === "PREMIUM" && (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">★</span>
                    )}
                    {r.pendingCreds > 0 && (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        {r.pendingCreds} to review
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {r.city || "—"} · {r.loggedTrips} logged · {r.verifiedLoads} verified
                    {r.lastLoad ? ` · last ${r.lastLoad.toLocaleDateString()}` : ""}
                  </p>
                  {r.credentials.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {r.credentials.map((c, i) => (
                        <span key={i} className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                          {licenseLabel(c.kind, c.customLabel)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Simple CSS bar — no chart library, so the page stays fast. */}
                  <div className="hidden w-32 sm:block">
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(r.verifiedLoads / maxLoads) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-muted">{r.verifiedLoads} loads</p>
                  </div>
                  <div className="w-20 text-right">
                    <p className={`font-bold ${r.avg === null ? "text-muted" : "text-amber-300"}`}>
                      {r.avg === null ? "—" : `★ ${formatRating(r.avg)}`}
                    </p>
                    <p className="text-[10px] text-muted">
                      {r.rated === 0
                        ? "no ratings"
                        : r.rated >= MIN_RATINGS_FOR_PUBLIC
                          ? `${r.rated} · public`
                          : `${r.rated} · hidden`}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted">
          A driver&apos;s average stays hidden from their public profile until they have at least{" "}
          {MIN_RATINGS_FOR_PUBLIC}{" "}rated loads, so one early bad load can&apos;t define them.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="card p-4">
      <p className={`text-2xl font-bold ${warn ? "text-amber-300" : accent ? "text-accent" : ""}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
