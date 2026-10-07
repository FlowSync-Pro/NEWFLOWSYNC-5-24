import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { FLEET } from "@/lib/pricing";
import { PAYOUT_CAP_CENTS } from "@/lib/payouts";
import AdminPayoutQueue, { type HistoryRow, type QueueDriver } from "@/components/AdminPayoutQueue";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fleet payouts", robots: { index: false } };

export default async function AdminPayoutsPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const driverSelect = { email: true, payPlan: true, stripeConnectPayoutsEnabled: true, driverProfile: { select: { id: true, firstName: true, lastName: true } } } as const;
  const [pending, recent] = await Promise.all([
    prisma.driverPayout.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { user: { select: driverSelect } } }),
    prisma.driverPayout.findMany({ orderBy: { createdAt: "desc" }, take: 150, include: { user: { select: driverSelect } } }),
  ]);

  const nameOf = (u: { email: string; driverProfile: { firstName: string; lastName: string } | null }) =>
    `${u.driverProfile?.firstName ?? ""} ${u.driverProfile?.lastName ?? ""}`.trim() || u.email;

  const byDriver = new Map<string, QueueDriver>();
  for (const p of pending) {
    const key = p.userId;
    const d = byDriver.get(key) ?? {
      driverProfileId: p.user.driverProfile?.id ?? null,
      name: nameOf(p.user),
      email: p.user.email,
      payPlan: p.user.payPlan,
      connectReady: p.user.stripeConnectPayoutsEnabled,
      count: 0,
      netCents: 0,
    };
    d.count++;
    d.netCents += p.netCents;
    byDriver.set(key, d);
  }

  const history: HistoryRow[] = recent.map((p) => ({
    id: p.id,
    status: p.status,
    driver: nameOf(p.user),
    driverProfileId: p.user.driverProfile?.id ?? null,
    loadCents: p.loadCents,
    feePercent: p.feePercent,
    netCents: p.netCents,
    note: p.note,
    deliveredOn: p.deliveredOn.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
    stripeTransferId: p.stripeTransferId,
    failureReason: p.failureReason,
  }));

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-40" />
      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Fleet payouts</h1>
        <p className="mt-2 text-sm text-muted">
          Log deliveries from each fleet driver&apos;s page. Standard drivers ({FLEET.dispatchFeePercent}%) are paid here every Friday with one click; faster drivers ({FLEET.fastPayoutFeePercent}%) are paid when logged. Transfers come from the FlowSync Stripe balance — top it up in Stripe → Balances before a run. Cap per transfer: ${PAYOUT_CAP_CENTS / 100}.
        </p>
        <AdminPayoutQueue queue={[...byDriver.values()]} history={history} />
      </div>
    </div>
  );
}
