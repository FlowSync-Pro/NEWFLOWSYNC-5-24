import { prisma } from "@/lib/db";
import { sendMarketing } from "@/lib/marketing";
import { finishSetupEmail, firstWeekEmail, winbackEmail } from "@/lib/email";
import { isPremiumTier, LEGACY_CUTOVER_AT } from "@/lib/pricing";
import { DAILY_HABITS, engagementFrom, LAUNCH_CHECKLIST, MILESTONES, parseProgress } from "@/lib/roadmap";
import { SITE_URL } from "@/lib/site";

/**
 * The daily follow-up sequence (run by /api/cron/followups). Each entry picks
 * who should get it today and builds the email; sendMarketing() decides
 * whether they may actually receive it (opt-out, refunds, admins, fleet,
 * once per kind, 48h gap). An email held back by the 48h gap is simply tried
 * again on a later day while the driver is still in the entry's window.
 */
export interface Followup {
  kind: string;
  excludeFleet?: boolean;
  /** User ids due for this follow-up today. */
  candidates(): Promise<string[]>;
  /** Subject + content for one user, or null to skip them. */
  build(userId: string): Promise<{ subject: string; heading: string; body: string } | null>;
}

/**
 * NEW BUYERS ONLY (owner decision, 2026-10-02): M2–M4 go only to drivers whose
 * first paid listing/fleet payment is at or after this moment (when the owner
 * approved them). Everyone who paid earlier gets nothing automated — the owner
 * reaches them by text from /admin/recovery. Moving this earlier would email
 * existing drivers, so don't.
 */
export const FOLLOWUPS_START_AT = new Date("2026-10-02T01:15:00Z");

const DAY_MS = 86_400_000;
const siteBase = () => process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;

/**
 * New buyers whose first paid listing/fleet payment was between minDays and
 * maxDays ago, and who don't already have a log row for `kind`.
 */
async function newBuyersPaidBetween(kind: string, minDays: number, maxDays: number): Promise<string[]> {
  const now = Date.now();
  const firstPaid = await prisma.payment.groupBy({
    by: ["userId"],
    where: { status: "PAID", type: { in: ["LISTING", "FLEET"] } },
    _min: { createdAt: true },
  });
  const due = firstPaid
    .filter((r) => {
      const at = r._min.createdAt;
      if (!at || at < FOLLOWUPS_START_AT || at < LEGACY_CUTOVER_AT) return false;
      const age = now - at.getTime();
      return age >= minDays * DAY_MS && age <= maxDays * DAY_MS;
    })
    .map((r) => r.userId);
  if (due.length === 0) return [];
  const already = await prisma.emailLog.findMany({ where: { kind, userId: { in: due } }, select: { userId: true } });
  const skip = new Set(already.map((l) => l.userId));
  return due.filter((id) => !skip.has(id));
}

async function firstNameOf(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, driverProfile: { select: { firstName: true } } } });
  return u?.driverProfile?.firstName?.trim() || u?.name?.trim().split(/\s+/)[0] || "there";
}

/** M2 — day 3: finish setup (profile, main service, license, insurance). */
export const M2_KIND = "m2-finish-setup";
const m2: Followup = {
  kind: M2_KIND,
  candidates: () => newBuyersPaidBetween(M2_KIND, 3, 30),
  async build(userId) {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId },
      select: { primaryService: true, verified: true, documents: { select: { kind: true } } },
    });
    if (profile?.verified) return null;
    const kinds = new Set(profile?.documents.map((d) => d.kind) ?? []);
    const profileUnfinished = !profile || !profile.primaryService;
    const missingLicense = !kinds.has("LICENSE");
    const missingInsurance = !kinds.has("INSURANCE");
    if (!profileUnfinished && !missingLicense && !missingInsurance) return null;
    return finishSetupEmail({
      firstName: await firstNameOf(userId),
      profileUnfinished,
      missingLicense,
      missingInsurance,
      url: `${siteBase()}${profile ? "/account/edit" : "/account/setup"}`,
    });
  },
};

/** M3 — day 7: the first week's three next steps. */
export const M3_KIND = "m3-first-week";
const m3: Followup = {
  kind: M3_KIND,
  candidates: () => newBuyersPaidBetween(M3_KIND, 7, 14),
  async build(userId) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { roadmapData: true, fleetJoinedAt: true, driverProfile: { select: { tier: true } } },
    });
    if (!u) return null;
    // New buyers are never legacy, so Premium tools come only from Premium or the fleet.
    const hasPremiumTools = isPremiumTier(u.driverProfile?.tier) || !!u.fleetJoinedAt;
    return firstWeekEmail({
      firstName: await firstNameOf(userId),
      launchPct: engagementFrom(parseProgress(u.roadmapData)).launchPct,
      showPremium: !hasPremiumTools,
      url: `${siteBase()}/account`,
    });
  },
};

/** The driver's next unticked Roadmap step (never the Premium milestone — M4 doesn't sell). */
function nextRoadmapStep(done: string[]): string {
  const next =
    LAUNCH_CHECKLIST.find((t) => !done.includes(t.id)) ??
    MILESTONES.find((m) => m.id !== "m-premium" && !done.includes(m.id)) ??
    DAILY_HABITS[0];
  return next.label;
}

/**
 * M4 — win-back for a quiet driver: paid 21+ days ago, no Roadmap check-in for
 * 14+ days (or never). At most twice ever, at least 30 days apart; never to
 * fleet members.
 */
export const M4_KIND_1 = "m4-winback-1";
export const M4_KIND_2 = "m4-winback-2";
const M4_QUIET_DAYS = 14;
const M4_REPEAT_DAYS = 30;

async function buildWinback(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { roadmapData: true } });
  if (!u) return null;
  const progress = parseProgress(u.roadmapData);
  const e = engagementFrom(progress);
  if (e.lastActiveDays !== null && e.lastActiveDays < M4_QUIET_DAYS) return null;
  return winbackEmail({
    firstName: await firstNameOf(userId),
    neverCheckedIn: e.lastActiveDays === null,
    nextStep: nextRoadmapStep(progress.tasks),
    url: `${siteBase()}/account`,
  });
}

const m4First: Followup = {
  kind: M4_KIND_1,
  excludeFleet: true,
  candidates: () => newBuyersPaidBetween(M4_KIND_1, 21, 3650),
  build: buildWinback,
};

const m4Second: Followup = {
  kind: M4_KIND_2,
  excludeFleet: true,
  async candidates() {
    const ids = await newBuyersPaidBetween(M4_KIND_2, 21, 3650);
    if (ids.length === 0) return [];
    // Only drivers whose first win-back actually went out 30+ days ago.
    const firsts = await prisma.emailLog.findMany({
      where: { kind: M4_KIND_1, userId: { in: ids }, cancelledAt: null, sentAt: { lte: new Date(Date.now() - M4_REPEAT_DAYS * DAY_MS) } },
      select: { userId: true },
    });
    return firsts.map((l) => l.userId);
  },
  build: buildWinback,
};

export const FOLLOWUPS: Followup[] = [m2, m3, m4First, m4Second];

export async function runFollowups(): Promise<{ kind: string; sent: number; skipped: number }[]> {
  const report = [];
  for (const f of FOLLOWUPS) {
    let sent = 0;
    let skipped = 0;
    for (const userId of await f.candidates()) {
      try {
        const email = await f.build(userId);
        if (!email) {
          skipped++;
          continue;
        }
        const r = await sendMarketing({ userId, kind: f.kind, excludeFleet: f.excludeFleet, ...email });
        if (r.sent) sent++;
        else skipped++;
      } catch (e) {
        // One driver's bad data must not stop everyone else's follow-ups.
        console.error(`[followups] ${f.kind} failed for ${userId}:`, e);
        skipped++;
      }
    }
    report.push({ kind: f.kind, sent, skipped });
  }
  return report;
}
