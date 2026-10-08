import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { OPEN_STATUSES, STATUS_LABEL, vehicleClassLabel } from "@/lib/dispatch";
import DispatchNewLoad from "@/components/DispatchNewLoad";
import { ptTime } from "@/lib/pt-time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dispatch", robots: { index: false } };

const $ = (c: number | null) => (c === null ? "—" : `$${(c / 100).toFixed(2)}`);

export default async function AdminDispatchPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const include = { assignedProfile: { select: { firstName: true, lastName: true } } } as const;
  const [open, closed, onDuty] = await Promise.all([
    prisma.dispatchLoad.findMany({ where: { status: { in: OPEN_STATUSES } }, orderBy: { pickupAt: "asc" }, include }),
    prisma.dispatchLoad.findMany({ where: { status: { notIn: OPEN_STATUSES } }, orderBy: { updatedAt: "desc" }, take: 30, include }),
    prisma.driverProfile.count({ where: { onDutyUntil: { gt: new Date() }, curriActivatedAt: { not: null }, user: { fleetJoinedAt: { not: null } } } }),
  ]);

  const Row = ({ l }: { l: (typeof open)[number] }) => (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <div>
        <Link href={`/admin/dispatch/${l.id}`} className="font-medium hover:text-accent">
          {l.pickupZip} → {l.dropoffZip}{l.curriRef ? ` · ${l.curriRef}` : ""}
        </Link>
        <span className="ml-2 text-xs text-muted">{l.rush ? "RUSH · " : ""}{ptTime(l.pickupAt)} · {vehicleClassLabel(l.vehicleClass)} · {l.lane === "CLAIM" ? "claim" : "bid"} · {l.tripMiles ?? "?"} mi</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">{l.assignedProfile ? `${l.assignedProfile.firstName} ${l.assignedProfile.lastName}` : "unassigned"}</span>
        <span>{$(l.bidCents ?? l.listedCents)}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${l.status === "NEW" ? "bg-amber-400/20 text-amber-300" : "bg-surface-2 text-muted"}`}>{STATUS_LABEL[l.status]}</span>
      </div>
    </li>
  );

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-40" />
      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Dispatch</h1>
        <p className="mt-2 text-sm text-muted">
          {onDuty} driver{onDuty === 1 ? "" : "s"} Active and activated right now. New loads are offered to every Active driver in range on Telegram; claim in Curri only after someone accepts.
        </p>

        <DispatchNewLoad />

        <section className="card mt-6 p-6">
          <h2 className="text-lg font-bold tracking-tight">Open loads</h2>
          {open.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing open.</p> : <ul className="mt-3 divide-y divide-border">{open.map((l) => <Row key={l.id} l={l} />)}</ul>}
        </section>

        {closed.length > 0 && (
          <section className="card mt-6 p-6">
            <h2 className="text-lg font-bold tracking-tight">Recently closed</h2>
            <ul className="mt-3 divide-y divide-border">{closed.map((l) => <Row key={l.id} l={l} />)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
