import type { Metadata } from "next";
import QuoteCalculator from "@/components/QuoteCalculator";
import { SITE_URL } from "@/lib/site";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Fair-quote calculator for delivery drivers",
  description:
    "Free calculator to price delivery and errand jobs fairly — covers your time and mileage, then shows how much more you keep on FlowSync (5% fee) vs. a typical gig app.",
  alternates: { canonical: `${SITE_URL}/calculator` },
};

// Dynamic because we read the session cookie to hide the "Get listed for $17"
// CTA from drivers who already paid.
export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  const session = await getSession();
  let alreadyListed = false;
  if (session) {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.userId },
      select: { listedAt: true },
    });
    alreadyListed = !!profile?.listedAt;
  }

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-80" />
      <div className="relative">
        <QuoteCalculator alreadyListed={alreadyListed} />
      </div>
    </div>
  );
}
