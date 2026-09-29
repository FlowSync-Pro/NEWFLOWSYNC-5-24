import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { isPremiumTier, LEGACY_CUTOVER_AT, TIER1_GUIDE_SLUGS } from "@/lib/pricing";

/**
 * What the signed-in driver is entitled to. One place, so every gate on the
 * site agrees.
 *
 *  - paid:    any PAID payment (listing or fleet) → Tier 1 (Verified)
 *  - premium: DriverProfile.tier is PREMIUM → Tier 2 (tools, all guides,
 *             the course, badge and placement)
 *  - fleet:   User.fleetJoinedAt is set → Tier 3, which includes Tier 2 access
 *             (the bidding calculator and the course exist for fleet drivers)
 *  - legacy:  first PAID payment before LEGACY_CUTOVER_AT. These drivers bought
 *             the old $17 offer that included every guide and every tool, and
 *             they keep all of it. Never take access away from a paying driver.
 *  - admin:   always everything
 */
export interface Entitlements {
  paid: boolean;
  premium: boolean;
  fleet: boolean;
  legacy: boolean;
  admin: boolean;
}

export async function getEntitlements(): Promise<Entitlements | null> {
  const session = await getSession();
  if (!session) return null;
  const admin = !!(await getAdminUserId());
  const [user, firstPaid] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { fleetJoinedAt: true, driverProfile: { select: { tier: true } } },
    }),
    prisma.payment.findFirst({
      where: { userId: session.userId, status: "PAID" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  return {
    paid: !!firstPaid,
    premium: isPremiumTier(user?.driverProfile?.tier),
    fleet: !!user?.fleetJoinedAt,
    legacy: !!firstPaid && firstPaid.createdAt < LEGACY_CUTOVER_AT,
    admin,
  };
}

/** Tier 2 access: the business tools, every guide, the course. */
export function hasProAccess(e: Entitlements | null): boolean {
  return !!e && (e.admin || e.premium || e.fleet || e.legacy);
}

/** Can this driver read a specific guide in full? */
export function canReadGuide(e: Entitlements | null, slug: string): boolean {
  if (!e) return false;
  if (hasProAccess(e)) return true;
  return e.paid && (TIER1_GUIDE_SLUGS as readonly string[]).includes(slug);
}

/**
 * True if the current visitor may read paid guides at all (any paid tier).
 * Kept for the guide index page; per-guide gating is canReadGuide().
 */
export async function hasGuideAccess(): Promise<boolean> {
  const e = await getEntitlements();
  return !!e && (e.admin || e.paid);
}
