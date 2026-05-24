import type { Metadata } from "next";
import OfferCheckout from "@/components/OfferCheckout";

export const metadata: Metadata = {
  title: "Pricing — Get listed for $17",
  description:
    "A one-time $17 gets you listed in the FlowSync driver directory with direct customer bookings — keep 95% of every job. Add the free DOT & EIN guide ($27) and the Profit & Loss tracker ($47).",
};

export default function PricingPage() {
  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-80" />
      <div className="relative">
        <OfferCheckout />
      </div>
    </div>
  );
}
