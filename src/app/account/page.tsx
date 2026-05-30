import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { dbToAppProfile } from "@/lib/profileMap";
import AccountEditor from "@/components/AccountEditor";
import TrackEvent from "@/components/TrackEvent";
// NOTE: P&L Tracker Pro ($17/mo) is on standby — the tracker is free for now.
// The subscription plumbing (PnlUpsell, /api/checkout pnl-subscribe, webhook,
// pnlProActive) is intact; re-add <PnlUpsell /> below to switch it back on.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit your account",
  description: "Update your driver profile, upload your documents, and get verified on FlowSync.",
  robots: { index: false },
};

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const db = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: { documents: true },
  });
  if (!db) redirect("/account/setup");

  const isAdmin = !!(await getAdminUserId());
  const justRegistered = (await searchParams).registered === "1";

  return (
    <div className="relative">
      {justRegistered && <TrackEvent event="CompleteRegistration" />}
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <AccountEditor initial={dbToAppProfile(db)} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
