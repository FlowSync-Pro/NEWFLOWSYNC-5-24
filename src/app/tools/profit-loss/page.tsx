import type { Metadata } from "next";
import ProfitLossTracker from "@/components/ProfitLossTracker";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Profit & Loss tracker for delivery drivers",
  description:
    "Track your delivery business income and expenses, see weekly and monthly net profit, and export tax-ready records. Free P&L tracker for FlowSync drivers.",
  alternates: { canonical: `${SITE_URL}/tools/profit-loss` },
};

export default function ProfitLossPage() {
  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <ProfitLossTracker />
      </div>
    </div>
  );
}
