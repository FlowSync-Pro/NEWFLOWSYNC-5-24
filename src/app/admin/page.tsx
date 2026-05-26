import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { serviceFromEnum } from "@/lib/enums";
import { getService } from "@/lib/services";
import AdminDrivers, { type AdminDriverRow } from "@/components/AdminDrivers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — driver verification",
  robots: { index: false },
};

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

  const rows = await prisma.driverProfile.findMany({
    include: { user: true, documents: true },
    orderBy: [{ verified: "asc" }, { createdAt: "desc" }],
  });

  const drivers: AdminDriverRow[] = rows.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`.trim(),
    email: p.user.email,
    service: getService(serviceFromEnum(p.primaryService))?.name ?? "—",
    city: p.city ?? "",
    verified: p.verified,
    tier: p.tier,
    createdAt: p.createdAt.toISOString(),
    documents: p.documents.map((d) => ({ kind: d.kind, url: d.blobUrl, status: d.status })),
  }));

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-48" />
      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Driver verification</h1>
            <p className="mt-1 text-muted">Review uploaded documents and approve drivers.</p>
          </div>
          <Link href="/find-a-driver" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Directory</Link>
        </div>
        <div className="mt-8">
          <AdminDrivers drivers={drivers} />
        </div>
      </div>
    </div>
  );
}
