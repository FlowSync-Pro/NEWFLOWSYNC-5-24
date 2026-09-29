import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId, isAdminEmail } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";
import { FLEET, LISTING_INCREASE_DATE_LABEL, LISTING_PRICE_AFTER, listingIncreasePending, listingPrice, TIERS } from "@/lib/pricing";
import { fleetPitchText, premiumPitchText, recoveryText, unpaidSignupText } from "@/lib/recovery";
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

/** Expired (abandoned) Stripe Checkouts for new buyers that left an email or phone. */
async function abandonedCheckouts(): Promise<{ rows: RecoveryRow[]; error: string | null }> {
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
  const [abandoned, unpaid, paidNotFleet] = await Promise.all([
    abandonedCheckouts(),
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
  ]);

  const nameOf = (u: { name: string | null; driverProfile: { firstName: string } | null }) => u.driverProfile?.firstName || u.name?.split(" ")[0] || "";

  const groups: RecoveryGroup[] = [
    {
      key: "abandoned",
      title: "Abandoned checkouts",
      blurb: abandoned.error ?? `Started Stripe Checkout in the last ${LOOKBACK_DAYS} days and didn't pay. Newest first. Text within the hour if you can — that converts best.`,
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
        mailSubject: "Loads dispatched to you — the Curri fleet",
      })),
    },
    {
      key: "premium",
      title: "Verified, not Premium",
      blurb: `Paid drivers still on Verified. The $${TIERS.premium.price} Premium pitch (done-for-you setup).`,
      rows: paidNotFleet
        .filter((u) => u.driverProfile && u.driverProfile.tier !== "PREMIUM")
        .map((u) => ({
          id: `p-${u.id}`,
          name: u.driverProfile!.firstName,
          email: u.email,
          phone: u.driverProfile!.phone ?? null,
          meta: `Verified driver${u.driverProfile!.city ? ` · ${u.driverProfile!.city}` : ""}`,
          text: premiumPitchText(u.driverProfile!.firstName, TIERS.premium.price),
          mailSubject: "Want me to build your FlowSync profile for you?",
        })),
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
            <p className="text-xs text-muted">from the account or homepage</p>
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
