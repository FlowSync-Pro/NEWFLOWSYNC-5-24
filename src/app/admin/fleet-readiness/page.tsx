import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { zipCentroid } from "@/lib/geo";
import { vehicleClassFromType } from "@/lib/dispatch";
import { readiness, readinessRank } from "@/lib/fleet-readiness";
import { ptClock, ptDay } from "@/lib/pt-time";
import CopyTextButton from "@/components/CopyTextButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fleet readiness — Admin", robots: { index: false } };

const OFFER_LOOKBACK_DAYS = 30;
const smsHref = (phone: string | null, body: string) => (phone ? `sms:${phone.replace(/[^+\d]/g, "")}?&body=${encodeURIComponent(body)}` : null);

/** Every fleet member with their readiness and recent offer counts, most-blocked first. */
async function loadRows() {
  const since = new Date(Date.now() - OFFER_LOOKBACK_DAYS * 86_400_000);
  const users = await prisma.user.findMany({
    where: { fleetJoinedAt: { not: null } },
    orderBy: { fleetJoinedAt: "asc" },
    select: {
      id: true, email: true, fleetJoinedAt: true, telegramChatId: true, stripeConnectAccountId: true, stripeConnectPayoutsEnabled: true,
      driverProfile: { select: { id: true, firstName: true, lastName: true, phone: true, baseZip: true, vehicleType: true, curriActivatedAt: true, onDutyUntil: true } },
    },
  });
  const profileIds = users.map((u) => u.driverProfile?.id).filter((x): x is string => !!x);
  const offerRows = profileIds.length
    ? await prisma.dispatchOffer.groupBy({ by: ["driverProfileId", "response"], where: { driverProfileId: { in: profileIds }, sentAt: { gte: since } }, _count: { _all: true } })
    : [];
  const offers = new Map<string, { sent: number; accepted: number }>();
  for (const r of offerRows) {
    const o = offers.get(r.driverProfileId) ?? { sent: 0, accepted: 0 };
    o.sent += r._count._all;
    if (r.response === "ACCEPTED") o.accepted += r._count._all;
    offers.set(r.driverProfileId, o);
  }

  const rows = users.map((u) => {
    const p = u.driverProfile;
    const r = readiness({
      hasProfile: !!p,
      firstName: p?.firstName ?? "",
      curriActivated: !!p?.curriActivatedAt,
      zipSet: !!p?.baseZip?.trim(),
      zipKnown: !!zipCentroid(p?.baseZip),
      vehicleType: p?.vehicleType ?? null,
      vehicleClass: vehicleClassFromType(p?.vehicleType),
      telegramLinked: !!u.telegramChatId,
      payoutsReady: !!u.stripeConnectAccountId && u.stripeConnectPayoutsEnabled,
      activeUntil: p?.onDutyUntil ?? null,
    });
    return { u, p, r, o: p ? offers.get(p.id) : undefined };
  }).sort((a, b) => readinessRank(b.r) - readinessRank(a.r));
  return rows;
}

// Owner-only, read-only. Every fleet member and whether a load offer can reach
// them (src/lib/fleet-readiness.ts), with a ready-to-send text for the steps
// that are theirs. Nothing is sent from here.
export default async function AdminFleetReadinessPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const rows = await loadRows();

  const blocked = rows.filter((x) => !x.r.canGetOffers).length;
  const active = rows.filter((x) => x.r.canGetOffers && x.r.activeNow).length;

  return (
    <div className="relative mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Fleet readiness</h1>
      <p className="mt-1 text-muted">
        Can a load offer reach each fleet driver? Offers need: activated on Curri, a home ZIP, a vehicle Curri can use, and Telegram
        connected, and then the driver going Active. Payouts are needed to get paid, not to get offers.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="card p-4"><p className="text-2xl font-bold">{rows.length}</p><p className="text-xs text-muted">Fleet members</p></div>
        <div className="card p-4"><p className={`text-2xl font-bold ${blocked ? "text-amber-300" : ""}`}>{blocked}</p><p className="text-xs text-muted">Can&apos;t get offers yet</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-accent">{active}</p><p className="text-xs text-muted">Active right now</p></div>
      </div>

      {rows.length === 0 && <div className="card mt-6 p-6 text-sm text-muted">No fleet members yet.</div>}

      <div className="mt-6 space-y-4">
        {rows.map(({ u, p, r, o }) => {
          const name = p ? `${p.firstName} ${p.lastName}`.trim() || u.email : u.email;
          const sms = r.nudge ? smsHref(p?.phone ?? null, r.nudge) : null;
          return (
            <section key={u.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">
                    {p ? <Link href={`/admin/drivers/${p.id}`} className="hover:text-accent">{name}</Link> : name}
                  </h2>
                  <p className="text-xs text-muted">
                    {[u.email, p?.phone, `joined ${ptDay(u.fleetJoinedAt!)}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${!r.canGetOffers ? "border-amber-300/40 text-amber-300" : r.activeNow ? "border-accent/40 text-accent" : "border-border text-muted"}`}>
                  {!r.canGetOffers ? "Can't get offers" : r.activeNow ? `Active until ${ptClock(p!.onDutyUntil!)}` : "Ready · not Active"}
                </span>
              </div>

              {!p && <p className="mt-3 text-sm text-red-400">No driver profile yet: they need to finish setup before anything else.</p>}

              <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                {r.checks.map((c) => (
                  <li key={c.id} className={`rounded-full border px-2.5 py-1 ${c.ok ? "border-accent/30 text-accent" : "border-red-400/30 text-red-300"}`} title={c.missing}>
                    {c.ok ? "✓" : "✗"} {c.label}
                  </li>
                ))}
              </ul>

              {r.checks.some((c) => !c.ok) && (
                <p className="mt-3 text-sm text-muted">
                  Missing: {r.checks.filter((c) => !c.ok).map((c) => `${c.missing}${c.who === "you" ? " (yours — on their driver page)" : ""}`).join(" · ")}
                </p>
              )}
              <p className="mt-1 text-xs text-muted">{o ? `Offers in the last ${OFFER_LOOKBACK_DAYS} days: ${o.sent} sent · ${o.accepted} accepted` : `No offers in the last ${OFFER_LOOKBACK_DAYS} days`}</p>

              {r.nudge && (
                <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
                  <p className="text-sm">{r.nudge}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CopyTextButton value={r.nudge} label="Copy text" />
                    {sms && <a href={sms} className="btn-ghost rounded-full px-5 py-2.5 text-sm">Text {p?.firstName || "them"}</a>}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
