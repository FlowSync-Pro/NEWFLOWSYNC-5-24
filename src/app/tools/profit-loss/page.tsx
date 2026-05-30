import type { Metadata } from "next";
import ProfitLossTracker from "@/components/ProfitLossTracker";
import { SITE_URL } from "@/lib/site";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { pnlProActive } from "@/lib/subscription";

export const metadata: Metadata = {
  title: "Profit & Loss tracker for delivery drivers",
  description:
    "Track your delivery business income and expenses, see weekly and monthly net profit, and export tax-ready records. Free P&L tracker for FlowSync drivers.",
  alternates: { canonical: `${SITE_URL}/tools/profit-loss` },
};

export default async function ProfitLossPage() {
  // Pro subscribers get the cloud-synced tracker; everyone else uses the free
  // local tool (so the page still renders + indexes for anonymous visitors).
  const session = await getSession();
  let cloud = false;
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    cloud = pnlProActive(user?.pnlSubStatus);
  }

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <ProfitLossTracker cloud={cloud} />
      </div>
    </div>
  );
}
