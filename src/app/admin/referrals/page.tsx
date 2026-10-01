import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { fleetBonusRows } from "@/lib/referrals";
import { FLEET } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fleet referrals", robots: { index: false } };

// Read-only. The fleet referral bonus is paid by hand once the referred driver
// is activated on the carrier account — activation isn't recorded in the app,
// so this page lists who qualifies and the owner tracks what's been paid.
export default async function AdminReferralsPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const rows = await fleetBonusRows();
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-40" />
      <div className="relative mx-auto max-w-5xl px-5 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin dashboard</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Fleet referrals</h1>
        <p className="mt-1 text-muted">
          Drivers who signed up through someone&apos;s referral link after the bonus launched ({fmt(FLEET.referralBonusStartsAt)}, {FLEET.referralBonusStartsAt.toISOString().slice(11, 16)} UTC) and
          joined the Curri fleet. Each one earns their referrer ${FLEET.referralBonus} <strong className="text-foreground">once
          you&apos;ve activated them</strong> on the carrier account.
        </p>
        <p className="mt-2 text-sm text-muted">
          Activation isn&apos;t recorded in the app, so pay by hand after you activate them and keep a note of what
          you&apos;ve paid. No bonus if their fleet fee was refunded before activation.
        </p>

        {rows.length === 0 ? (
          <div className="card mt-6 p-6 text-sm text-muted">No fleet referrals yet.</div>
        ) : (
          <div className="card mt-6 overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Joined the fleet</th>
                  <th className="px-4 py-3">Referred driver</th>
                  <th className="px-4 py-3">Pay ${FLEET.referralBonus} to</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.driver.email}-${r.driver.joinedFleetAt.toISOString()}`} className="border-b border-border/60 last:border-0 align-top">
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(r.driver.joinedFleetAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.driver.name}</div>
                      <div className="text-xs text-muted">{r.driver.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {r.referrer ? (
                        <>
                          <div className="font-medium">{r.referrer.name}</div>
                          <div className="text-xs text-muted">{r.referrer.email}</div>
                          {r.referrer.phone && <div className="text-xs text-muted">{r.referrer.phone}</div>}
                          <div className="text-xs text-muted">Code {r.referrer.code}</div>
                        </>
                      ) : (
                        <span className="text-xs text-muted">Referrer not found</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
