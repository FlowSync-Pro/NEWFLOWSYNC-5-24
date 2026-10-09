import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId, isAdminEmail } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";
import { FLEET, LISTING_INCREASE_DATE_LABEL, LISTING_PRICE_AFTER, listingIncreasePending, listingPrice, premiumUpgradePrice } from "@/lib/pricing";
import {
  fleetFollowUpText,
  fleetPitchText,
  fleetReferralLink,
  listingFollowUpText,
  premiumFollowUpText,
  premiumPitchText,
  recoveryText,
  referralAskText,
  unpaidFollowUpText,
  unpaidSignupText,
} from "@/lib/recovery";
import { fromPtWallClock, ptDate, ptDay } from "@/lib/pt-time";
import RecoveryLists, { type RecoveryGroup, type RecoveryRow } from "@/components/RecoveryLists";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recovery — Admin", robots: { index: false } };

const LOOKBACK_DAYS = 60;
const MAX_SESSIONS = 600;

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

const ago = (d: Date) => {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

/**
 * This month's fleet spots. FLEET.monthlyCap limits ACTIVATIONS, so "room"
 * means fewer than the cap activated since the 1st (Pacific time) — the only
 * basis for the follow-up's "there's still room this month". Members still
 * waiting to be activated are shown alongside, for the owner's judgment.
 */
async function fleetSpotsThisMonth(): Promise<{ activated: number; waiting: number; room: boolean }> {
  const monthStart = fromPtWallClock(`${ptDate(new Date()).slice(0, 8)}01T00:00`) ?? new Date();
  const [activated, waiting] = await Promise.all([
    prisma.driverProfile.count({ where: { curriActivatedAt: { gte: monthStart }, user: { fleetJoinedAt: { not: null } } } }),
    prisma.driverProfile.count({ where: { curriActivatedAt: null, user: { fleetJoinedAt: { not: null } } } }),
  ]);
  return { activated, waiting, room: activated < FLEET.monthlyCap };
}

/** Expired (abandoned) Stripe Checkouts for new buyers that left an email or phone. */
async function abandonedCheckouts(roomThisMonth: boolean): Promise<{ rows: RecoveryRow[]; error: string | null }> {
  const stripe = getStripe();
  if (!stripe) return { rows: [], error: "Stripe isn't configured, so abandoned checkouts can't be listed here." };
  try {
    const since = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 86_400;
    const byEmail = new Map<string, RecoveryRow & { created: number }>();
    let seen = 0;
    for await (const s of stripe.checkout.sessions.list({ status: "expired", created: { gte: since }, limit: 100 })) {
      if (++seen > MAX_SESSIONS) break;
      const md = s.metadata ?? {};
      const product = md.type === "listing" ? "listing" : md.type === "fleet" && md.standalone === "1" ? "fleet" : null;
      if (!product) continue;
      const email = (s.customer_details?.email ?? s.customer_email ?? md.email ?? "").toLowerCase();
      const phone = s.customer_details?.phone ?? null;
      if (!email && !phone) continue;
      const key = email || `phone:${phone}`;
      const prev = byEmail.get(key);
      if (prev && prev.created > s.created) continue; // keep the most recent attempt
      const firstName = md.firstName || s.customer_details?.name?.split(" ")[0] || "";
      byEmail.set(key, {
        id: s.id,
        created: s.created,
        name: [firstName, md.lastName].filter(Boolean).join(" ") || s.customer_details?.name || "",
        email: email || null,
        phone,
        meta: `Abandoned the ${product === "fleet" ? `$${FLEET.price} fleet invite` : `$${((s.amount_total ?? 0) / 100).toFixed(0)} listing`} · ${ago(new Date(s.created * 1000))}`,
        text: recoveryText(product, firstName),
        followUp: product === "fleet" ? fleetFollowUpText(firstName, roomThisMonth, "public") : listingFollowUpText(firstName),
        mailSubject: product === "fleet" ? "Your fleet spot is still open" : "Your FlowSync listing is still waiting",
      });
    }
    // Drop anyone who has since paid.
    const emails = [...byEmail.keys()].filter((k) => !k.startsWith("phone:"));
    const paid = emails.length
      ? await prisma.user.findMany({ where: { email: { in: emails }, payments: { some: { status: "PAID" } } }, select: { email: true } })
      : [];
    for (const p of paid) byEmail.delete(p.email.toLowerCase());
    const rows: RecoveryRow[] = [...byEmail.values()].sort((a, b) => b.created - a.created);
    return { rows, error: null };
  } catch (e) {
    console.error("[recovery] Stripe list failed:", e instanceof Error ? e.message : e);
    return { rows: [], error: "Couldn't load abandoned checkouts from Stripe right now." };
  }
}

export default async function AdminRecoveryPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const since = daysAgo(90);
  const spots = await fleetSpotsThisMonth();
  const [abandoned, unpaid, paidNotFleet, fleetMembers] = await Promise.all([
    abandonedCheckouts(spots.room),
    prisma.user.findMany({
      where: { role: "DRIVER", createdAt: { gte: since }, payments: { none: { status: "PAID" } } },
      select: { id: true, email: true, name: true, createdAt: true, driverProfile: { select: { firstName: true, phone: true, city: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.user.findMany({
      where: { role: "DRIVER", fleetJoinedAt: null, payments: { some: { status: "PAID" } } },
      select: { id: true, email: true, name: true, driverProfile: { select: { firstName: true, phone: true, city: true, tier: true, listedAt: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    // Read-only: an existing referral code is used as-is; none is created here.
    prisma.user.findMany({
      where: { role: "DRIVER", fleetJoinedAt: { not: null } },
      select: { id: true, email: true, name: true, referralCode: true, fleetJoinedAt: true, driverProfile: { select: { firstName: true, phone: true, curriActivatedAt: true } } },
      orderBy: { fleetJoinedAt: "desc" },
      take: 300,
    }),
  ]);

  const nameOf = (u: { name: string | null; driverProfile: { firstName: string } | null }) => u.driverProfile?.firstName || u.name?.split(" ")[0] || "";

  const groups: RecoveryGroup[] = [
    {
      key: "abandoned",
      title: "Abandoned checkouts",
      blurb: abandoned.error ?? `Started Stripe Checkout in the last ${LOOKBACK_DAYS} days and didn't pay. Newest first. Call the fleet ones if you can; otherwise text within the hour — that converts best.`,
      rows: abandoned.rows,
    },
    {
      key: "unpaid",
      title: "Signed up, never paid",
      blurb: "Made a free account in the last 90 days but never bought the listing. Warm: they already know FlowSync.",
      rows: unpaid.filter((u) => !isAdminEmail(u.email)).map((u) => ({
        id: u.id,
        name: u.driverProfile ? `${u.driverProfile.firstName}` : u.name ?? "",
        email: u.email,
        phone: u.driverProfile?.phone ?? null,
        meta: `Signed up ${ago(u.createdAt)}${u.driverProfile?.city ? ` · ${u.driverProfile.city}` : ""}`,
        text: unpaidSignupText(nameOf(u)),
        followUp: unpaidFollowUpText(nameOf(u)),
        mailSubject: "Your FlowSync profile isn't listed yet",
      })),
    },
    {
      key: "fleet",
      title: "Paid drivers, not in the fleet",
      blurb: `Your warmest list for the $${FLEET.price} fleet invite. They already paid you once.`,
      rows: paidNotFleet.map((u) => ({
        id: u.id,
        name: u.driverProfile ? `${u.driverProfile.firstName}` : u.name ?? "",
        email: u.email,
        phone: u.driverProfile?.phone ?? null,
        meta: `${u.driverProfile?.tier === "PREMIUM" ? "Premium" : "Verified"} driver${u.driverProfile?.city ? ` · ${u.driverProfile.city}` : ""}`,
        text: fleetPitchText(nameOf(u)),
        followUp: fleetFollowUpText(nameOf(u), spots.room, "account"),
        mailSubject: "Loads dispatched to you — the Curri fleet",
      })),
    },
    {
      key: "premium",
      title: "Verified, not Premium",
      blurb: `Paid drivers still on Verified. The Premium pitch — $${premiumUpgradePrice()} to upgrade (tools, course, badge).`,
      rows: paidNotFleet
        .filter((u) => u.driverProfile && u.driverProfile.tier !== "PREMIUM")
        .map((u) => ({
          id: `p-${u.id}`,
          name: u.driverProfile!.firstName,
          email: u.email,
          phone: u.driverProfile!.phone ?? null,
          meta: `Verified driver${u.driverProfile!.city ? ` · ${u.driverProfile!.city}` : ""}`,
          text: premiumPitchText(u.driverProfile!.firstName, premiumUpgradePrice()),
          followUp: premiumFollowUpText(u.driverProfile!.firstName, premiumUpgradePrice()),
          mailSubject: "Want me to build your FlowSync profile for you?",
        })),
    },
    {
      key: "referrals",
      title: "Fleet drivers — ask for a referral",
      blurb: `Your fleet members, activated first. Each text carries their own referral link (or tells them where to find it) and the $${FLEET.referralBonus} terms. A favor, so send it once — no follow-up.`,
      rows: fleetMembers
        .filter((u) => !isAdminEmail(u.email))
        .sort((a, b) => Number(!!b.driverProfile?.curriActivatedAt) - Number(!!a.driverProfile?.curriActivatedAt))
        .map((u) => {
          const activated = !!u.driverProfile?.curriActivatedAt;
          return {
            id: `r-${u.id}`,
            name: u.driverProfile?.firstName ?? u.name ?? "",
            email: u.email,
            phone: u.driverProfile?.phone ?? null,
            meta: `Fleet member since ${ptDay(u.fleetJoinedAt!)} · ${activated ? "activated on Curri" : "not marked activated yet"}${u.referralCode ? "" : " · no link yet (made when they open their account)"}`,
            text: referralAskText(nameOf(u), u.referralCode ? fleetReferralLink(u.referralCode) : null, activated),
            mailSubject: "Know a driver who wants loads?",
          };
        }),
    },
  ];

  const total = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-48" />
      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Recovery</h1>
        <p className="mt-1 text-muted">
          {total} people to follow up with. Every row has the exact message; <strong className="text-foreground">Text</strong> opens
          your SMS app with it filled in (on your phone), <strong className="text-foreground">Email</strong> does the same for mail.
          Under each message is the one follow-up — send it two days later, only if they haven&apos;t replied.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs text-muted">Listing price right now</p>
            <p className="mt-1 text-2xl font-bold text-accent">${listingPrice()}</p>
            <p className="text-xs text-muted">
              {listingIncreasePending() ? `Goes to $${LISTING_PRICE_AFTER} on ${LISTING_INCREASE_DATE_LABEL}` : "Increase is live"}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted">Fleet invite</p>
            <p className="mt-1 text-2xl font-bold text-accent">${FLEET.price}</p>
            <p className="text-xs text-muted">
              {spots.activated} of {FLEET.monthlyCap} activated this month{spots.waiting ? ` · ${spots.waiting} waiting to be activated` : ""} —
              follow-ups {spots.room ? "say there's still room" : "say this month is full"}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted">Rules of thumb</p>
            <p className="mt-1 text-sm">One text, one follow-up two days later. Stop if they say stop.</p>
          </div>
        </div>

        <div className="mt-8">
          <RecoveryLists groups={groups} />
        </div>
      </div>
    </div>
  );
}
