import type { Metadata } from "next";
import OfferCheckout from "@/components/OfferCheckout";
import JsonLd from "@/components/JsonLd";
import { BUMPS, TIERS } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";
import { getSocialProof } from "@/lib/social-proof";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — get listed for $17",
  description:
    "Get listed in the FlowSync driver directory for a one-time $17 and keep 95% of every job — your DOT & EIN setup guide is included. Upgrade to Premium ($97) anytime from your account for a custom service menu and priority placement.",
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
  const ref = typeof sp.ref === "string" ? sp.ref : Array.isArray(sp.ref) ? sp.ref[0] : "";
  const proof = await getSocialProof();
  return (
    <div className="relative">
      <JsonLd data={productLd} />
      <div className="glow-radial pointer-events-none absolute inset-0 h-80" />
      <div className="relative">
        <OfferCheckout proof={proof} referralCode={ref} />
      </div>
    </div>
  );
}
