import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { parseProgress } from "@/lib/roadmap";
import { CHALLENGE_MADE_IT_ID, CHALLENGE_STARTS_AT, CHALLENGE_STEPS, challengeDay, challengeName } from "@/lib/challenge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Challenge — Admin", robots: { index: false } };

// Read-only. Drivers in the First-$47 Challenge (new buyers since launch), how
// many of the 7 steps they've ticked, and who says they made their $47 back —
// worth a personal message (and, with their permission, a testimonial).
export default async function AdminChallengePage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const firstPaid = await prisma.payment.groupBy({
    by: ["userId"],
    where: { status: "PAID", type: { in: ["LISTING", "FLEET"] } },
    _min: { createdAt: true },
  });
  const joined = new Map(
    firstPaid.filter((r) => r._min.createdAt && r._min.createdAt >= CHALLENGE_STARTS_AT).map((r) => [r.userId, r._min.createdAt!]),
  );
  const users = joined.size
    ? await prisma.user.findMany({
        where: { id: { in: [...joined.keys()] } },
        select: { id: true, email: true, name: true, roadmapData: true, driverProfile: { select: { firstName: true, lastName: true } } },
      })
    : [];
  const rows = users
    .map((u) => {
      const tasks = parseProgress(u.roadmapData).tasks;
      const paidAt = joined.get(u.id)!;
      return {
        id: u.id,
        name: u.driverProfile ? `${u.driverProfile.firstName} ${u.driverProfile.lastName}`.trim() : u.name ?? "—",
        email: u.email,
        paidAt,
        day: challengeDay(paidAt),
        steps: CHALLENGE_STEPS.filter((s) => tasks.includes(s.id)).length,
        madeIt: tasks.includes(CHALLENGE_MADE_IT_ID),
      };
    })
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-40" />
      <div className="relative mx-auto max-w-5xl px-5 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin dashboard</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{`The ${challengeName()}`}</h1>
        <p className="mt-1 text-muted">
          {`New buyers since ${fmt(CHALLENGE_STARTS_AT)}. ${rows.length} in total, ${rows.filter((r) => r.madeIt).length} say they made it back. It has nothing to do with refunds — those follow the refund policy as always.`}
        </p>

        {rows.length === 0 ? (
          <div className="card mt-6 p-6 text-sm text-muted">No one in the challenge yet.</div>
        ) : (
          <div className="card mt-6 overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Steps</th>
                  <th className="px-4 py-3">Made it back?</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(r.paidAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted">{r.email}</div>
                    </td>
                    <td className="px-4 py-3">{r.day ? `${r.day} of 7` : "Done"}</td>
                    <td className="px-4 py-3">{`${r.steps}/${CHALLENGE_STEPS.length}`}</td>
                    <td className="px-4 py-3">{r.madeIt ? <span className="font-semibold text-accent">Yes 🎉</span> : <span className="text-muted">—</span>}</td>
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
