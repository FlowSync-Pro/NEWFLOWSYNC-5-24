import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isPremiumTier, TIERS } from "@/lib/pricing";
import MyServicesEditor, { type ServiceRow } from "@/components/MyServicesEditor";
import UpgradeButton from "@/components/UpgradeButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Services",
  robots: { index: false },
};

export default async function MyServicesPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: { services: { orderBy: { sortOrder: "asc" } } },
  });
  if (!profile) redirect("/account/setup");

  const premium = isPremiumTier(profile.tier);

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-48" />
      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Services</h1>
            <p className="mt-1 text-muted">Build your own service menu and set your own prices.</p>
          </div>
          <Link href="/account" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Account</Link>
        </div>

        <div className="mt-8">
          {premium ? (
            <MyServicesEditor services={profile.services as ServiceRow[]} />
          ) : (
            <div className="card overflow-hidden">
              <div className="border-b border-border bg-accent-soft px-7 py-6">
                <p className="text-sm font-semibold uppercase tracking-widest text-accent">Premium feature</p>
                <h2 className="mt-2 text-2xl font-bold">Build your own service menu</h2>
                <p className="mt-2 max-w-xl text-muted">
                  Upgrade to Premium to create your own services with custom pricing — like the pros do —
                  plus a Premium badge, elevated profile styling, and your own website link.
                </p>
              </div>
              <div className="flex flex-col items-start justify-between gap-4 p-7 sm:flex-row sm:items-center">
                <div>
                  <p className="text-3xl font-extrabold text-accent">${TIERS.premium.price}<span className="text-base font-medium text-muted"> one-time</span></p>
                  <p className="text-sm text-muted">Upgrade from Standard anytime.</p>
                </div>
                <UpgradeButton label={`Upgrade to Premium — $${TIERS.premium.price}`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
