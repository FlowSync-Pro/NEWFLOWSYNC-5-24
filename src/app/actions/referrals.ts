"use server";

import { getSession } from "@/lib/session";
import { referralStats, type ReferralStats } from "@/lib/referrals";

/** Returns the signed-in driver's referral stats (code, count, reward state). */
export async function getMyReferralStats(): Promise<ReferralStats | null> {
  const session = await getSession();
  if (!session) return null;
  return referralStats(session.userId);
}
