import { prisma } from "@/lib/db";

export interface SocialProof {
  /** Total drivers who have created an account. */
  totalDrivers: number;
  /** Drivers who joined in the last 7 days. */
  joinedThisWeek: number;
  /** True once we have enough drivers that a raw count is impressive on its own. */
  showCount: boolean;
  /** A few recent signups (first name + city + when) for the activity ticker. */
  recent: { name: string; city: string | null; agoHours: number }[];
}

// Below this, we lead with "founding driver — be one of the first" framing
// instead of a small raw number (which would undercut trust). Both are honest.
const COUNT_THRESHOLD = 50;

export async function getSocialProof(): Promise<SocialProof> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const [totalDrivers, joinedThisWeek, recentRows] = await Promise.all([
      prisma.user.count({ where: { role: "DRIVER" } }),
      prisma.user.count({ where: { role: "DRIVER", createdAt: { gte: weekAgo } } }),
      prisma.driverProfile.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { firstName: true, city: true, createdAt: true },
      }),
    ]);

    const recent = recentRows
      .filter((r) => r.firstName)
      .map((r) => ({
        name: r.firstName,
        city: r.city,
        agoHours: Math.max(1, Math.round((Date.now() - r.createdAt.getTime()) / 3_600_000)),
      }));

    return {
      totalDrivers,
      joinedThisWeek,
      showCount: totalDrivers >= COUNT_THRESHOLD,
      recent,
    };
  } catch {
    // DB unreachable (e.g. build-time) — degrade to the founding-driver framing.
    return { totalDrivers: 0, joinedThisWeek: 0, showCount: false, recent: [] };
  }
}
