import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { FLEET } from "@/lib/pricing";

// Referral program: drivers share a link, and when someone they refer gets
// listed (pays), it's attributed. Hitting REWARD_THRESHOLD paid referrals
// auto-upgrades the referrer to Premium — a reward that costs no cash and
// turns every driver into a demand/driver-acquisition channel.

export const REWARD_THRESHOLD = 3;
export const REFERRAL_COOKIE = "fs_ref";

/** Generate a short, URL-safe, human-shareable referral code. */
function newCode(): string {
  return randomBytes(5).toString("base64url").replace(/[-_]/g, "").slice(0, 7).toUpperCase();
}

/** Get (or lazily create) a user's own referral code. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (user?.referralCode) return user.referralCode;

  // Retry on the rare unique collision.
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // unique violation — try another code
    }
  }
  throw new Error("Could not allocate a referral code.");
}

export interface ReferralStats {
  code: string;
  referred: number; // people who signed up & paid under this code
  rewarded: boolean; // has the referrer already earned the Premium reward
  remaining: number; // referrals left until the next reward
  fleetReferred: number; // referred drivers who joined the fleet and count toward the fleet bonus
}

/**
 * Who counts toward the fleet referral bonus: signed up through the link on or
 * after the bonus launched (no retroactive payouts) and has joined the fleet.
 * Activation — when the $50 is actually owed — isn't tracked in the app; the
 * owner pays manually after activating them.
 */
const fleetBonusWhere = (code: string) => ({
  referredByCode: code,
  createdAt: { gte: FLEET.referralBonusStartsAt },
  fleetJoinedAt: { gte: FLEET.referralBonusStartsAt },
});

export async function referralStats(userId: string): Promise<ReferralStats> {
  const code = await ensureReferralCode(userId);
  const [referred, fleetReferred, me] = await Promise.all([
    prisma.user.count({ where: { referredByCode: code } }),
    prisma.user.count({ where: fleetBonusWhere(code) }),
    prisma.user.findUnique({ where: { id: userId }, include: { driverProfile: true } }),
  ]);
  const rewarded = me?.driverProfile?.tier === "PREMIUM";
  return { code, referred, rewarded, remaining: Math.max(0, REWARD_THRESHOLD - referred), fleetReferred };
}

export interface FleetBonusRow {
  driver: { name: string; email: string; joinedFleetAt: Date };
  referrer: { name: string; email: string; phone: string | null; code: string } | null;
}

/** Admin, read-only: every fleet join that earns a referrer the bonus once activated. Newest first. */
export async function fleetBonusRows(): Promise<FleetBonusRow[]> {
  const joined = await prisma.user.findMany({
    where: {
      referredByCode: { not: null },
      createdAt: { gte: FLEET.referralBonusStartsAt },
      fleetJoinedAt: { gte: FLEET.referralBonusStartsAt },
    },
    select: { email: true, name: true, referredByCode: true, fleetJoinedAt: true, driverProfile: { select: { firstName: true, lastName: true } } },
    orderBy: { fleetJoinedAt: "desc" },
  });
  const codes = [...new Set(joined.map((u) => u.referredByCode!))];
  const referrers = await prisma.user.findMany({
    where: { referralCode: { in: codes } },
    select: { referralCode: true, email: true, name: true, driverProfile: { select: { firstName: true, lastName: true, phone: true } } },
  });
  const byCode = new Map(referrers.map((r) => [r.referralCode!, r]));
  const nameOf = (u: { name: string | null; email: string; driverProfile: { firstName: string; lastName: string } | null }) =>
    (u.driverProfile ? `${u.driverProfile.firstName} ${u.driverProfile.lastName}`.trim() : "") || u.name || u.email;
  return joined.map((u) => {
    const r = byCode.get(u.referredByCode!);
    return {
      driver: { name: nameOf(u), email: u.email, joinedFleetAt: u.fleetJoinedAt! },
      referrer: r ? { name: nameOf(r), email: r.email, phone: r.driverProfile?.phone ?? null, code: r.referralCode! } : null,
    };
  });
}

/**
 * Called from the Stripe webhook after a referred driver pays. Records the
 * attribution (once) and, if the referrer crosses the threshold, upgrades them
 * to Premium. Safe to call repeatedly; it no-ops when nothing should change.
 */
export async function attributeReferral(newUserId: string, rawCode: string | undefined | null): Promise<void> {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (!code) return;

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    include: { driverProfile: true },
  });
  if (!referrer || referrer.id === newUserId) return; // unknown code or self-referral

  const me = await prisma.user.findUnique({ where: { id: newUserId }, select: { referredByCode: true } });
  if (me?.referredByCode) return; // already attributed

  await prisma.user.update({ where: { id: newUserId }, data: { referredByCode: code } });

  // Reward: upgrade the referrer to Premium once they hit the threshold.
  const count = await prisma.user.count({ where: { referredByCode: code } });
  if (count >= REWARD_THRESHOLD && referrer.driverProfile && referrer.driverProfile.tier !== "PREMIUM") {
    await prisma.driverProfile.update({
      where: { id: referrer.driverProfile.id },
      data: { tier: "PREMIUM" },
    });
  }
}
