import type { Metadata } from "next";
import OfferCheckout from "@/components/OfferCheckout";
import JsonLd from "@/components/JsonLd";
import { BUMPS, TIERS, type TierId } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing — Standard $17 or Premium $97",
  description:
    "Get listed in the FlowSync driver directory and keep 95% of every job. Standard ($17) for direct bookings, or Premium ($97) to build your own service menu with custom pricing. Optional DOT & EIN guide and Profit & Loss tracker add-ons.",
  alternates: { canonical: `${SITE_URL}/pricing` },
};

const productLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "FlowSync Driver Listing",
  description: "Get listed and take direct bookings — keep 95% of every job.",
  brand: { "@type": "Brand", name: "FlowSync" },
  offers: [
    ...Object.values(TIERS).map((t) => ({
      "@type": "Offer",
      name: `${t.name} listing`,
      price: String(t.price),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/pricing`,
    })),
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

export default async function PricingPage({ searchParams }: PageProps<"/pricing">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.tier) ? sp.tier[0] : sp.tier;
  const initialTier: TierId = raw === "premium" ? "premium" : "standard";

  return (
    <div className="relative">
      <JsonLd data={productLd} />
      <div className="glow-radial pointer-events-none absolute inset-0 h-80" />
      <div className="relative">
        <OfferCheckout initialTier={initialTier} />
      </div>
    </div>
  );
}
