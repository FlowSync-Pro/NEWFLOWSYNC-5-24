import type { Metadata } from "next";
import EarningsQuiz from "@/components/EarningsQuiz";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "What are delivery loads going for with your vehicle?",
  description:
    "Pick your vehicle and see recent bids we placed on real Curri loads — per load, before expenses. A snapshot, not a promise.",
  alternates: { canonical: `${SITE_URL}/tools/earnings` },
};

export default function EarningsPage() {
  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <EarningsQuiz />
      </div>
    </div>
  );
}
