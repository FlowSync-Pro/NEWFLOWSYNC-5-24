import { prisma } from "./db";
import { getStripe } from "./stripe";
import { alertOwner } from "./alerts";
import { ptTime } from "./pt-time";
import { SITE_URL } from "./site";

// "Paid, can't get in" (owner decision 2026-10-09, after a $47 buyer couldn't
// sign in). Every paid checkout is fulfilled by the Stripe webhook, and every
// fulfillment writes a Payment row keyed by stripeSessionId. A paid Checkout
// with NO such row means Stripe's "payment succeeded" message never reached
// us (or failed) — the buyer paid but got no account, upgrade or fleet spot.
// Read-only: lists Stripe sessions and checks our database; changes nothing.
// Customer bookings and the retired P&L plan are other flows and are skipped.

const RECORDED_TYPES = ["listing", "fleet", "upgrade"] as const;
type RecordedType = (typeof RECORDED_TYPES)[number];
/** A session paid in the last few minutes may still be on its way to us. */
const SETTLE_MINUTES = 15;
const MAX_SESSIONS = 600;

export interface UnrecordedPayment {
  sessionId: string;
  created: Date;
  amountCents: number;
  product: RecordedType;
  /** True when the buyer already had an account (bought from it); false for a new buyer. */
  existingAccount: boolean;
  email: string | null;
  phone: string | null;
  firstName: string;
  name: string;
}

export const productLabel = (p: RecordedType, amountCents: number) =>
  `$${(amountCents / 100).toFixed(0)} ${p === "fleet" ? "fleet" : p === "upgrade" ? "Premium upgrade" : "listing"}`;

/** Paid Checkouts (last `sinceDays`) that the site never recorded. Newest first. */
export async function paidButUnrecorded(sinceDays: number): Promise<{ rows: UnrecordedPayment[]; error: string | null }> {
  const stripe = getStripe();
  if (!stripe) return { rows: [], error: "Stripe isn't configured, so paid checkouts can't be checked." };
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const found: (UnrecordedPayment & { userId: string | null })[] = [];
    let seen = 0;
    for await (const s of stripe.checkout.sessions.list({ status: "complete", created: { gte: nowSec - sinceDays * 86_400 }, limit: 100 })) {
      if (++seen > MAX_SESSIONS) break;
      const md = s.metadata ?? {};
      const type = md.type as RecordedType;
      if (s.payment_status !== "paid" || s.created > nowSec - SETTLE_MINUTES * 60 || !RECORDED_TYPES.includes(type)) continue;
      const first = md.firstName || s.customer_details?.name?.split(" ")[0] || "";
      found.push({
        sessionId: s.id,
        created: new Date(s.created * 1000),
        amountCents: s.amount_total ?? 0,
        product: type,
        existingAccount: !!md.userId,
        userId: md.userId || null,
        email: (s.customer_details?.email ?? s.customer_email ?? md.email ?? "").toLowerCase() || null,
        phone: s.customer_details?.phone ?? md.phone ?? null,
        firstName: first,
        name: [md.firstName, md.lastName].filter(Boolean).join(" ") || s.customer_details?.name || "",
      });
    }
    if (!found.length) return { rows: [], error: null };

    const recorded = new Set(
      (await prisma.payment.findMany({ where: { stripeSessionId: { in: found.map((f) => f.sessionId) } }, select: { stripeSessionId: true } }))
        .map((p) => p.stripeSessionId),
    );
    const missing = found.filter((f) => !recorded.has(f.sessionId));

    // Bought from an existing account (upgrade / fleet from the account): fill in who it is.
    const ids = [...new Set(missing.map((m) => m.userId).filter((x): x is string => !!x))];
    const users = ids.length
      ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, name: true, driverProfile: { select: { firstName: true, lastName: true, phone: true } } } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    const rows = missing.map(({ userId, ...m }) => {
      const u = userId ? byId.get(userId) : undefined;
      if (!u) return m;
      return {
        ...m,
        email: m.email ?? u.email,
        phone: m.phone ?? u.driverProfile?.phone ?? null,
        firstName: m.firstName || u.driverProfile?.firstName || u.name?.split(" ")[0] || "",
        name: m.name || (u.driverProfile ? `${u.driverProfile.firstName} ${u.driverProfile.lastName}`.trim() : u.name ?? ""),
      };
    });
    return { rows: rows.sort((a, b) => b.created.getTime() - a.created.getTime()), error: null };
  } catch (e) {
    console.error("[paid-check] Stripe check failed:", e instanceof Error ? e.message : e);
    return { rows: [], error: "Couldn't check Stripe right now." };
  }
}

/**
 * The daily safety check (api/cron/followups): emails the owner when anyone
 * who paid in the last 2 days isn't recorded on the site, so a broken Stripe
 * connection can't go unnoticed for more than a day. Never throws.
 */
export async function alertIfPaidUnrecorded(): Promise<{ checked: boolean; unrecorded: number }> {
  try {
    const { rows, error } = await paidButUnrecorded(2);
    if (error) return { checked: false, unrecorded: 0 };
    if (rows.length) {
      const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
      await alertOwner(
        `⚠️ ${rows.length} buyer${rows.length === 1 ? "" : "s"} paid but the site never recorded it\n\n` +
          rows.slice(0, 10).map((r) => `• ${r.name || "(no name)"} · ${r.email ?? "no email"} · ${productLabel(r.product, r.amountCents)} · ${ptTime(r.created)}`).join("\n") +
          (rows.length > 10 ? `\n…and ${rows.length - 10} more` : "") +
          `\n\nThey paid in Stripe but got no account / upgrade on the site — Stripe's "payment succeeded" message didn't arrive. ` +
          `Fix: Stripe → Developers → Webhooks → your flowsyncdriver.com endpoint. If deliveries are failing, update STRIPE_WEBHOOK_SECRET in Vercel and redeploy, ` +
          `then click Resend on each failed checkout.session.completed (safe — the site never records a payment twice).\n` +
          `Ready texts for each buyer: ${base}/admin/recovery`,
      );
    }
    return { checked: true, unrecorded: rows.length };
  } catch (e) {
    console.error("[paid-check] daily check failed:", e instanceof Error ? e.message : e);
    return { checked: false, unrecorded: 0 };
  }
}

/**
 * Name + phone as typed at checkout, for paid buyers the site has no profile
 * for yet (Stripe kept what they entered). Read-only; at most 20 lookups.
 */
export async function checkoutContacts(sessionIds: string[]): Promise<Map<string, { name: string; phone: string | null }>> {
  const out = new Map<string, { name: string; phone: string | null }>();
  const stripe = getStripe();
  if (!stripe) return out;
  await Promise.all(
    [...new Set(sessionIds)].slice(0, 20).map(async (id) => {
      try {
        const s = await stripe.checkout.sessions.retrieve(id);
        const md = s.metadata ?? {};
        out.set(id, {
          name: s.customer_details?.name || [md.firstName, md.lastName].filter(Boolean).join(" "),
          phone: s.customer_details?.phone ?? md.phone ?? null,
        });
      } catch {
        // Not found / key mismatch — the row shows what the site has.
      }
    }),
  );
  return out;
}
