import type { Metadata } from "next";
import { ptDay } from "@/lib/pt-time";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId, isAdminEmail } from "@/lib/admin";
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

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  // ?driver=<profile id> (from the recovery page) opens that driver's card on the All tab.
  const sp = await searchParams;
  const focusDriverId = typeof sp.driver === "string" ? sp.driver : undefined;
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

  // Newest signups, read from the User table rather than DriverProfile: the
  // pricing-page checkout no longer asks for a name or service, so the
  // webhook creates the account WITHOUT a profile. Until the driver signs in
  // and finishes /account/setup they don't exist in the driver list below —
  // this is the only place the owner can see them right after they pay.
  const newest = await prisma.user.findMany({
    where: { role: "DRIVER" },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      mustResetPassword: true,
      fleetJoinedAt: true,
      payments: { where: { status: "PAID" }, select: { amount: true } },
      driverProfile: {
        select: { id: true, firstName: true, lastName: true, phone: true, city: true, verified: true, tier: true, _count: { select: { documents: true } } },
      },
    },
  });

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
            <Link href="/admin/recovery" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Recovery</Link>
            <Link href="/admin/referrals" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Fleet referrals</Link>
            <Link href="/admin/payouts" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Fleet payouts</Link>
            <Link href="/admin/dispatch" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Dispatch</Link>
            <Link href="/admin/leads" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Leads</Link>
            <Link href="/admin/challenge" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Challenge</Link>
            <Link href="/admin/add-city" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Add-city email</Link>
            <Link href="/admin/fleet-invite" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Fleet invite email</Link>
            <Link href="/admin/experience" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Experience &amp; ratings</Link>
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

        {/* Newest signups — every new account, paid or not, the moment it exists */}
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-accent">Newest signups</h2>
        <p className="mt-1 text-xs text-muted">
          Newest first. A driver who paid but hasn&apos;t finished setup yet is listed here and nowhere else — they move to
          &ldquo;Paid · to verify&rdquo; below once they sign in and enter their name and service.
        </p>
        <div className="mt-3 space-y-2">
          {newest.filter((u) => !isAdminEmail(u.email)).map((u) => {
            const p = u.driverProfile;
            const paidCents = u.payments.reduce((n, x) => n + x.amount, 0);
            const name = p ? `${p.firstName} ${p.lastName}`.trim() : u.name?.trim() || "";
            const chips: { label: string; cls: string }[] = [];
            if (paidCents > 0) chips.push({ label: `Paid ${money(paidCents)}`, cls: "bg-accent-soft text-accent" });
            else chips.push({ label: "Unpaid", cls: "bg-surface-2 text-muted" });
            if (u.mustResetPassword) chips.push({ label: "Hasn't set a password", cls: "bg-amber-400/20 text-amber-300" });
            if (!p) chips.push({ label: "Hasn't finished setup", cls: "bg-amber-400/20 text-amber-300" });
            else {
              chips.push({ label: `${p._count.documents}/5 documents`, cls: "bg-surface-2 text-muted" });
              chips.push(p.verified ? { label: "Verified", cls: "bg-accent text-[#04130a]" } : { label: "Pending approval", cls: "bg-surface-2 text-muted" });
              if (p.tier === "PREMIUM") chips.push({ label: "★ Premium", cls: "bg-amber-400/20 text-amber-300" });
            }
            if (u.fleetJoinedAt) chips.push({ label: "🚚 Fleet", cls: "bg-accent-soft text-accent" });
            return (
              <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{name || <span className="text-muted">(no name yet)</span>}</p>
                  <p className="truncate text-xs text-muted">
                    {u.email}{p?.phone ? ` · ${p.phone}` : ""}{p?.city ? ` · ${p.city}` : ""} · joined {ptDay(u.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {chips.map((c) => (
                    <span key={c.label} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.cls}`}>{c.label}</span>
                  ))}
                  {p && (
                    <Link href={`/admin/drivers/${p.id}`} className="rounded-full border border-border px-3 py-0.5 text-[11px] text-muted hover:text-foreground">View ops</Link>
                  )}
                </div>
              </div>
            );
          })}
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
          <AdminDrivers drivers={drivers} focusId={focusDriverId} />
        </div>
      </div>
    </div>
  );
}
