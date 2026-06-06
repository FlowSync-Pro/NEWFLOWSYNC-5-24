import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { serviceFromEnum } from "@/lib/enums";
import { getService } from "@/lib/services";
import { money } from "@/lib/trips";
import { engagementFrom, parseProgress } from "@/lib/roadmap";
import AdminDrivers, { type AdminDriverRow } from "@/components/AdminDrivers";
import AdminAddDriver from "@/components/AdminAddDriver";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — dashboard",
  robots: { index: false },
};

async function salesSince(days: number) {
  const gte = new Date(Date.now() - days * 86400000);
  const r = await prisma.payment.aggregate({
    _sum: { amount: true },
    _count: true,
    where: { status: "PAID", createdAt: { gte } },
  });
  return { amount: r._sum.amount ?? 0, count: r._count };
}

function SalesCard({ label, data }: { label: string; data: { amount: number; count: number } }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-accent">{money(data.amount)}</p>
      <p className="text-xs text-muted">{data.count} payment{data.count === 1 ? "" : "s"}</p>
    </div>
  );
}

function PipeStat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "ok" }) {
  return (
    <div className="card p-4">
      <p className={`text-2xl font-bold ${tone === "warn" ? "text-amber-300" : tone === "ok" ? "text-accent" : ""}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const adminId = await getAdminUserId();
  if (!adminId) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <div className="card p-10">
          <h1 className="text-xl font-bold">Not authorized</h1>
          <p className="mt-3 text-sm text-muted">
            This area is for FlowSync admins. Add your email to the <code>ADMIN_EMAILS</code>{" "}
            environment variable to access it.
          </p>
          <Link href="/account" className="btn-ghost mt-6 inline-flex rounded-full px-6 py-2.5 text-sm">Back to account</Link>
        </div>
      </div>
    );
  }

  const [today, d7, d14, d30, rows, paidPayments] = await Promise.all([
    salesSince(1),
    salesSince(7),
    salesSince(14),
    salesSince(30),
    prisma.driverProfile.findMany({
      include: { user: true, documents: true, _count: { select: { trips: true } } },
      orderBy: [{ verified: "asc" }, { createdAt: "desc" }],
    }),
    prisma.payment.findMany({ where: { status: "PAID" }, select: { userId: true } }),
  ]);

  const pendingReviewCount = await prisma.review.count({ where: { status: "PENDING" } });
  const paidUserIds = new Set(paidPayments.map((p) => p.userId));

  const drivers: AdminDriverRow[] = rows.map((p) => {
    const eng = engagementFrom(parseProgress(p.user.roadmapData));
    return {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`.trim(),
      email: p.user.email,
      service: getService(serviceFromEnum(p.primaryService))?.name ?? "—",
      city: p.city ?? "",
      verified: p.verified,
      tier: p.tier,
      paid: paidUserIds.has(p.userId),
      trips: p._count.trips,
      createdAt: p.createdAt.toISOString(),
      documents: p.documents.map((d) => ({ kind: d.kind, url: d.blobUrl, status: d.status })),
      streak: eng.streak,
      lastActiveDays: eng.lastActiveDays,
      launchPct: eng.launchPct,
      engagement: eng.status,
    };
  });

  // Pipeline
  const paidPending = drivers.filter((d) => !d.verified && d.paid).length;
  const unpaidPending = drivers.filter((d) => !d.verified && !d.paid).length;
  const verified = drivers.filter((d) => d.verified).length;
  const premium = drivers.filter((d) => d.tier === "PREMIUM").length;
  const totalTrips = drivers.reduce((n, d) => n + d.trips, 0);

  // Engagement (retention triage) — only meaningful among verified drivers.
  const verifiedDrivers = drivers.filter((d) => d.verified);
  const active = verifiedDrivers.filter((d) => d.engagement === "active").length;
  const cooling = verifiedDrivers.filter((d) => d.engagement === "cooling").length;
  const coldOrDormant = verifiedDrivers.filter((d) => d.engagement === "cold" || d.engagement === "dormant").length;

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-48" />
      <div className="relative mx-auto max-w-5xl px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin dashboard</h1>
            <p className="mt-1 text-muted">Sales, your driver pipeline, and verification.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/reviews" className="btn-ghost rounded-full px-5 py-2.5 text-sm">
              Reviews{pendingReviewCount > 0 && (
                <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">{pendingReviewCount} pending</span>
              )}
            </Link>
            <Link href="/find-a-driver" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Directory</Link>
          </div>
        </div>

        {/* Sales */}
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-accent">Sales</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SalesCard label="Today" data={today} />
          <SalesCard label="Last 7 days" data={d7} />
          <SalesCard label="Last 14 days" data={d14} />
          <SalesCard label="Last 30 days" data={d30} />
        </div>

        {/* Pipeline */}
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-accent">Driver pipeline</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <PipeStat label="Paid · to verify" value={paidPending} tone="warn" />
          <PipeStat label="Applied · unpaid" value={unpaidPending} />
          <PipeStat label="Verified" value={verified} tone="ok" />
          <PipeStat label="Premium" value={premium} />
          <PipeStat label="Drivers" value={drivers.length} />
          <PipeStat label="Trips logged" value={totalTrips} />
        </div>

        {/* Engagement — who to reach out to */}
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-accent">Engagement (verified drivers)</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <PipeStat label="Active (last 3 days)" value={active} tone="ok" />
          <PipeStat label="Cooling (4–10 days)" value={cooling} tone="warn" />
          <PipeStat label="Cold / never active" value={coldOrDormant} />
        </div>

        {/* Drivers */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">Drivers</h2>
          <AdminAddDriver />
        </div>
        <div className="mt-3">
          <AdminDrivers drivers={drivers} />
        </div>
      </div>
    </div>
  );
}
