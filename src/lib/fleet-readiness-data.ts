import { prisma } from "./db";
import { zipCentroid } from "./geo";
import { vehicleClassFromType } from "./dispatch";
import { readiness, readinessRank } from "./fleet-readiness";

// Reads for the Fleet readiness board and its "Send on Telegram" button
// (src/lib/fleet-readiness.ts has the pure checks). Read-only.

export const OFFER_LOOKBACK_DAYS = 30;

/** Every fleet member with their readiness and recent offer counts, most-blocked first. */
export async function loadFleetReadiness(onlyUserId?: string) {
  const since = new Date(Date.now() - OFFER_LOOKBACK_DAYS * 86_400_000);
  const users = await prisma.user.findMany({
    where: { fleetJoinedAt: { not: null }, ...(onlyUserId ? { id: onlyUserId } : {}) },
    orderBy: { fleetJoinedAt: "asc" },
    select: {
      id: true, email: true, fleetJoinedAt: true, telegramChatId: true, stripeConnectAccountId: true, stripeConnectPayoutsEnabled: true,
      driverProfile: { select: { id: true, firstName: true, lastName: true, phone: true, baseZip: true, vehicleType: true, curriActivatedAt: true, onDutyUntil: true } },
    },
  });
  const profileIds = users.map((u) => u.driverProfile?.id).filter((x): x is string => !!x);
  const offerRows = profileIds.length
    ? await prisma.dispatchOffer.groupBy({ by: ["driverProfileId", "response"], where: { driverProfileId: { in: profileIds }, sentAt: { gte: since } }, _count: { _all: true } })
    : [];
  const offers = new Map<string, { sent: number; accepted: number }>();
  for (const r of offerRows) {
    const o = offers.get(r.driverProfileId) ?? { sent: 0, accepted: 0 };
    o.sent += r._count._all;
    if (r.response === "ACCEPTED") o.accepted += r._count._all;
    offers.set(r.driverProfileId, o);
  }

  const rows = users.map((u) => {
    const p = u.driverProfile;
    const r = readiness({
      hasProfile: !!p,
      firstName: p?.firstName ?? "",
      curriActivated: !!p?.curriActivatedAt,
      zipSet: !!p?.baseZip?.trim(),
      zipKnown: !!zipCentroid(p?.baseZip),
      vehicleType: p?.vehicleType ?? null,
      vehicleClass: vehicleClassFromType(p?.vehicleType),
      telegramLinked: !!u.telegramChatId,
      payoutsReady: !!u.stripeConnectAccountId && u.stripeConnectPayoutsEnabled,
      activeUntil: p?.onDutyUntil ?? null,
    });
    return { u, p, r, o: p ? offers.get(p.id) : undefined };
  }).sort((a, b) => readinessRank(b.r) - readinessRank(a.r));
  return rows;
}

/** One fleet member's readiness (null when they aren't in the fleet). */
export async function fleetReadinessFor(userId: string) {
  return (await loadFleetReadiness(userId))[0] ?? null;
}
