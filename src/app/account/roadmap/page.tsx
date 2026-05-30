import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { currentStreak, parseProgress, todayKey } from "@/lib/roadmap";
import RoadmapTracker from "@/components/RoadmapTracker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Roadmap",
  description: "Stay on track day by day — launch checklist, daily game plan, and milestones to grow your delivery business.",
  robots: { index: false },
};

export default async function RoadmapPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const [profile, user] = await Promise.all([
    prisma.driverProfile.findUnique({ where: { userId: session.userId }, select: { firstName: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { roadmapData: true } }),
  ]);
  if (!profile) redirect("/account/setup");

  const progress = parseProgress(user?.roadmapData);

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <RoadmapTracker
          firstName={profile.firstName}
          initialTasks={progress.tasks}
          streak={currentStreak(progress.days)}
          checkedInToday={progress.days.includes(todayKey())}
        />
      </div>
    </div>
  );
}
