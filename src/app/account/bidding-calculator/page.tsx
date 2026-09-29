import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEntitlements, hasProAccess } from "@/lib/access";
import BiddingCalculator from "@/components/BiddingCalculator";
import ProGate from "@/components/ProGate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bidding calculator", robots: { index: false } };

export default async function BiddingCalculatorPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const ent = await getEntitlements();
  if (!hasProAccess(ent)) {
    return (
      <ProGate
        title="The bidding calculator is part of Premium"
        blurb="Know your break-even, what a load has to pay to be worth your hour, and what to bid — before you tap accept."
      />
    );
  }

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-48" />
      <div className="relative mx-auto max-w-5xl px-5 py-10">
        <Link href="/account" className="text-sm text-muted hover:text-foreground">← Account</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Bidding calculator</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Gig accounts accept the listed price. Carriers bid. Enter the load and your real numbers and
          get your floor, your target, and the bid.
        </p>
        <div className="mt-8"><BiddingCalculator /></div>
      </div>
    </div>
  );
}
