import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { driverCostPerMile, rankCandidates, suggestBid, vehicleClassLabel, LANE_LABEL } from "@/lib/dispatch";
import DispatchLoadPanel, { type PanelBid } from "@/components/DispatchLoadPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dispatch load", robots: { index: false } };

export default async function AdminDispatchLoadPage({ params }: PageProps<"/admin/dispatch/[id]">) {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");
  const { id } = await params;

  const load = await prisma.dispatchLoad.findUnique({
    where: { id },
    include: {
      assignedProfile: { select: { id: true, firstName: true, lastName: true, phone: true, user: { select: { email: true } } } },
      offers: { orderBy: { sentAt: "desc" }, include: { driverProfile: { select: { firstName: true, lastName: true } } } },
      events: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!load) notFound();

  const candidates = await rankCandidates(load);
  const actorIds = [...new Set(load.events.map((e) => e.actorId).filter((x): x is string => !!x))];
  const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true, name: true } }) : [];
  const actorName = (aid: string | null) => (aid ? (actors.find((a) => a.id === aid)?.name || actors.find((a) => a.id === aid)?.email || "admin") : "system");

  // Suggested bid for the best candidate (covered first, else nearest), with their own cost per mile.
  const best = candidates.find((c) => c.covered) ?? candidates.find((c) => c.milesToPickup !== null);
  let bid: PanelBid = null;
  if (best && load.tripMiles !== null && best.milesToPickup !== null) {
    const cpm = await driverCostPerMile(best.profileId);
    const s = suggestBid({ tripMiles: load.tripMiles, milesToPickup: best.milesToPickup, costPerMile: cpm.value, costPerMileSource: cpm.source, listedCents: load.listedCents });
    bid = { suggested: s.suggested, floor: s.floor, worthIt: s.worthIt, costPerMile: s.costPerMile, costPerMileSource: s.costPerMileSource, deadheadMiles: s.deadheadMiles, hours: s.hours, forName: best.name };
  }

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-40" />
      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <Link href="/admin/dispatch" className="text-sm text-muted hover:text-foreground">← Dispatch</Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          {load.pickupZip} → {load.dropoffZip}{load.curriRef ? ` · Curri ${load.curriRef}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {load.rush ? "RUSH · " : ""}pickup {load.pickupAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {vehicleClassLabel(load.vehicleClass)} · {LANE_LABEL[load.lane]} · ~{load.tripMiles ?? "?"} mi
          {load.listedCents !== null && <> · listed ${(load.listedCents / 100).toFixed(2)}</>}
        </p>
        <p className="mt-1 text-sm text-muted">{load.pickupAddress} → {load.dropoffAddress}{load.notes ? ` · ${load.notes}` : ""}</p>

        <DispatchLoadPanel
          load={{
            id: load.id, status: load.status, lane: load.lane, rush: load.rush, pickupAt: load.pickupAt.toISOString(),
            pickupAddress: load.pickupAddress, pickupZip: load.pickupZip, dropoffAddress: load.dropoffAddress, dropoffZip: load.dropoffZip,
            tripMiles: load.tripMiles, vehicleLabel: vehicleClassLabel(load.vehicleClass), listedCents: load.listedCents, bidCents: load.bidCents,
            notes: load.notes, curriRef: load.curriRef, payoutId: load.payoutId,
            assigned: load.assignedProfile ? { profileId: load.assignedProfile.id, name: `${load.assignedProfile.firstName} ${load.assignedProfile.lastName}`.trim(), phone: load.assignedProfile.phone, email: load.assignedProfile.user.email } : null,
          }}
          candidates={candidates.map((c) => ({ profileId: c.profileId, name: c.name, phone: c.phone, vehicleLabel: vehicleClassLabel(c.vehicleClass), baseZip: c.baseZip, milesToPickup: c.milesToPickup, minutesToPickup: c.minutesToPickup, onDuty: c.onDuty, onTelegram: c.onTelegram, covered: c.covered, assignable: c.activated && c.vehicleOk && !c.busy, reasons: c.reasons }))}
          offers={load.offers.map((o) => ({ id: o.id, profileId: o.driverProfileId, name: `${o.driverProfile.firstName} ${o.driverProfile.lastName}`.trim(), response: o.response, expiresAt: o.expiresAt.toISOString() }))}
          events={load.events.map((e) => ({ id: e.id, at: e.createdAt.toISOString(), actor: actorName(e.actorId), from: e.fromStatus, to: e.toStatus, note: e.note }))}
          bid={bid}
        />
      </div>
    </div>
  );
}
