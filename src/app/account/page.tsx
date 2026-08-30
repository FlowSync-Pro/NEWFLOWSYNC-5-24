import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { currentStreak, parseProgress, todayKey } from "@/lib/roadmap";
import { referralStats, REWARD_THRESHOLD } from "@/lib/referrals";
import { isPremiumTier } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";
import RoadmapTracker from "@/components/RoadmapTracker";
import ReferralCard from "@/components/ReferralCard";
import FounderLoom from "@/components/FounderLoom";
import TelegramCTA from "@/components/TelegramCTA";
import TrackEvent from "@/components/TrackEvent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  description: "Your FlowSync dashboard — start here.",
  robots: { index: false },
};

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const [profile, user] = await Promise.all([
    prisma.driverProfile.findUnique({ where: { userId: session.userId }, select: { firstName: true, tier: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { roadmapData: true, email: true } }),
  ]);
  if (!profile) redirect("/account/setup");

  const isAdmin = !!(await getAdminUserId());
  const premium = isPremiumTier(profile.tier);
  const justRegistered = (await searchParams).registered === "1";
  const progress = parseProgress(user?.roadmapData);
  const ref = await referralStats(session.userId);
  const shareBase = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;

  return (
    <div className="relative">
      {justRegistered && <TrackEvent event="CompleteRegistration" />}
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        {/* Top utility row — kept tiny so it doesn't compete with the start-here block */}
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-2 px-5 pt-6 text-xs">
          {isAdmin && <Link href="/admin" className="rounded-full border border-border px-3 py-1 text-muted hover:text-foreground">Admin</Link>}
          <Link href="/account/edit" className="rounded-full border border-border px-3 py-1 text-muted hover:text-foreground">Edit profile & documents</Link>
          <Link href="/account/trips" className="rounded-full border border-border px-3 py-1 text-muted hover:text-foreground">Operations</Link>
          <Link href="/account/services" className="rounded-full border border-border px-3 py-1 text-muted hover:text-foreground">My Services</Link>
          <Link href="/account/experience" className="rounded-full border border-border px-3 py-1 text-muted hover:text-foreground">Experience</Link>
          {premium && (
            <Link href="/account/curri-fleet" className="rounded-full border border-border px-3 py-1 text-muted hover:text-foreground">Curri fleet</Link>
          )}
          <Link href="/grow" className="rounded-full border border-border px-3 py-1 text-muted hover:text-foreground">Resources</Link>
          <Link href="/account/bookings" className="rounded-full border border-border px-3 py-1 text-muted hover:text-foreground">Bookings</Link>
          <Link href="/account/share-experience" className="rounded-full border border-border px-3 py-1 text-muted hover:text-foreground">Leave a review</Link>
        </div>

        {/* Start here — single focus block at the top */}
        <div className="mx-auto mt-6 max-w-3xl space-y-5 px-5">
          <FounderLoom firstName={profile.firstName} />
          <TelegramCTA />
          {premium && (
            <Link
              href="/account/curri-fleet"
              className="flex items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-5 transition-colors hover:bg-accent-soft/80"
            >
              <div>
                <p className="text-sm font-bold text-accent">Curri fleet</p>
                <p className="mt-0.5 text-xs text-muted">
                  How to get activated on our carrier account, how nearby loads work, and how pay works.
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-accent">Open guide →</span>
            </Link>
          )}
        </div>

        {/* The Roadmap is the dashboard. Everything else is a side trip. */}
        <RoadmapTracker
          firstName={profile.firstName}
          initialTasks={progress.tasks}
          streak={currentStreak(progress.days)}
          checkedInToday={progress.days.includes(todayKey())}
        />

        <div className="mx-auto max-w-3xl px-5 pb-12">
          <ReferralCard
            code={ref.code}
            referred={ref.referred}
            remaining={ref.remaining}
            rewarded={ref.rewarded}
            threshold={REWARD_THRESHOLD}
            shareBase={shareBase}
          />
        </div>
      </div>
    </div>
  );
}
