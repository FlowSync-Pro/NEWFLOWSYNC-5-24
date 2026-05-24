import type { Metadata } from "next";
import OfferCheckout from "@/components/OfferCheckout";
import JsonLd from "@/components/JsonLd";
import { BUMPS, CORE_OFFER } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing — Get listed for $17",
  description:
    "A one-time $17 gets you listed in the FlowSync driver directory with direct customer bookings — keep 95% of every job. Add the free DOT & EIN guide ($27) and the Profit & Loss tracker ($47).",
  alternates: { canonical: `${SITE_URL}/pricing` },
};

const productLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: CORE_OFFER.name,
  description: CORE_OFFER.tagline,
  brand: { "@type": "Brand", name: "FlowSync" },
  offers: [
    {
      "@type": "Offer",
      name: CORE_OFFER.name,
      price: String(CORE_OFFER.price),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/pricing`,
    },
    ...BUMPS.map((b) => ({
      "@type": "Offer",
      name: b.name,
      price: String(b.price),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/pricing`,
    })),
  ],
};

export default function PricingPage() {
  return (
    <div className="relative">
      <JsonLd data={productLd} />
      <div className="glow-radial pointer-events-none absolute inset-0 h-80" />
      <div className="relative">
        <OfferCheckout />
      </div>
    </div>
  );
}
