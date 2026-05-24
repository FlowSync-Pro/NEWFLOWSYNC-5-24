import type { Metadata } from "next";
import DriverDashboard from "@/components/DriverDashboard";

export const metadata: Metadata = {
  title: "Driver dashboard",
  description: "Set a monthly goal, track your streak, and unlock awards as you grow your delivery business on FlowSync.",
};

export default function DashboardPage() {
  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <DriverDashboard />
      </div>
    </div>
  );
}
