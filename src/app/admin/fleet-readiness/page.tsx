import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { ptClock, ptDay } from "@/lib/pt-time";
import ReadinessNudge from "@/components/ReadinessNudge";
import { loadFleetReadiness, OFFER_LOOKBACK_DAYS } from "@/lib/fleet-readiness-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fleet readiness — Admin", robots: { index: false } };


// Owner-only, read-only. Every fleet member and whether a load offer can reach
// them (src/lib/fleet-readiness.ts), with a ready-to-send text for the steps
// that are theirs. Nothing is sent from here.
export default async function AdminFleetReadinessPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const rows = await loadFleetReadiness();

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
                <ReadinessNudge userId={u.id} nudge={r.nudge} firstName={p?.firstName ?? ""} phone={p?.phone ?? null} onTelegram={!!u.telegramChatId} />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
