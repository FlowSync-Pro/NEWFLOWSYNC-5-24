import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { VEHICLES } from "@/lib/earnings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leads — Admin", robots: { index: false } };

// Read-only list of free-tool email signups (the /tools/earnings quiz). These
// people asked for one email; nothing else goes to them until the owner
// approves a follow-up.
export default async function AdminLeadsPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  const label = (id: string | null) => VEHICLES.find((v) => v.id === id)?.label ?? id ?? "—";
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const active = leads.filter((l) => !l.unsubscribedAt).length;

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-40" />
      <div className="relative mx-auto max-w-5xl px-5 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin dashboard</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Leads</h1>
        <p className="mt-1 text-muted">
          People who asked for their breakdown on the load-rate tool (/tools/earnings). {leads.length} total, {active} still
          subscribed. They&apos;ve only been sent the email they asked for.
        </p>

        {leads.length === 0 ? (
          <div className="card mt-6 p-6 text-sm text-muted">No leads yet.</div>
        ) : (
          <div className="card mt-6 overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(l.createdAt)}</td>
                    <td className="px-4 py-3">{l.email}</td>
                    <td className="px-4 py-3">{label(l.vehicle)}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {l.unsubscribedAt ? `Unsubscribed ${fmt(l.unsubscribedAt)}` : "Subscribed"}
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
