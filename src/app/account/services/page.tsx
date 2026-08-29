import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isPremiumTier, TIERS } from "@/lib/pricing";
import MyServicesEditor, { type ServiceRow } from "@/components/MyServicesEditor";
import TrackEvent from "@/components/TrackEvent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Services",
  robots: { index: false },
};

export default async function MyServicesPage({ searchParams }: PageProps<"/account/services">) {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");
  const justUpgraded = (await searchParams).upgraded === "1";

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: { services: { orderBy: { sortOrder: "asc" } } },
  });
  if (!profile) redirect("/account/setup");

  const premium = isPremiumTier(profile.tier);

  return (
    <div className="relative">
      {justUpgraded && premium && <TrackEvent event="Purchase" value={TIERS.premium.price} />}
      <div className="glow-radial pointer-events-none absolute inset-0 h-48" />
      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Services</h1>
            <p className="mt-1 text-muted">Build your own service menu and set your own prices.</p>
          </div>
          <Link href="/account" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Account</Link>
        </div>

        {premium && (
          <Link
            href="/account/curri-fleet"
            className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-5 transition-colors hover:bg-accent-soft/80"
          >
            <div>
              <p className="text-sm font-bold text-accent">
                {justUpgraded ? "Next — Curri fleet" : "Curri fleet"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Ask to be added on our carrier account, then claim, bid, or reject nearby loads. Pay is 1–2 business days, or instant with a 6% fee.
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-accent">Open guide →</span>
          </Link>
        )}

        <div className="mt-8">
          <MyServicesEditor services={profile.services as ServiceRow[]} />
        </div>
      </div>
    </div>
  );
}
