import type { Metadata } from "next";
import QuoteCalculator from "@/components/QuoteCalculator";

export const metadata: Metadata = {
  title: "Fair-quote calculator for delivery drivers",
  description:
    "Free calculator to price delivery and errand jobs fairly — covers your time and mileage, then shows how much more you keep on FlowSync (5% fee) vs. a typical gig app.",
};

export default function CalculatorPage() {
  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-80" />
      <div className="relative">
        <QuoteCalculator />
      </div>
    </div>
  );
}
