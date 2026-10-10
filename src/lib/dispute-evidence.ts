import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { refundWindowDaysFor, REFUND_CHECKBOX } from "@/lib/pricing";
import { parseProgress } from "@/lib/roadmap";
import { calendarDay, ptDay, ptTime } from "@/lib/pt-time";
import { SITE_URL } from "@/lib/site";

// Owner-only, read-only: everything the site and Stripe hold about one buyer,
// laid out as plain text for a Stripe dispute response (docs/STRIPE-DISPUTE-RESPONSE.md).
// Nothing is written anywhere. Only facts the system really records are listed;
// what isn't recorded is said so, so the owner never claims it.

/** When the 7-day wording, checkbox and listing-email terms line went live (PR #67 deploy, Oct 10 ~10am PT). */
const SEVEN_DAY_WORDING_LIVE_AT = new Date("2026-10-10T17:00:00Z");
/** When the Premium email and Premium offer page started carrying the terms (PR #68 deploy). */
const PREMIUM_TERMS_LIVE_AT = new Date("2026-10-10T19:00:00Z");
/** Purchases this close to a deploy may have seen either wording: say "check". */
const DEPLOY_FUZZ_MS = 30 * 60_000;

const DAY_MS = 86_400_000;
const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
/** "Oct 12, 2026, 11:04 AM PT" — with the year, for a bank reader. */
const when = (d: Date) => ptTime(d, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

type Product = "listing" | "premium-offer" | "premium-account" | "fleet" | "listing-or-premium";

function productName(p: Product): string {
  switch (p) {
    case "listing": return "Verified listing";
    case "premium-offer": return "Premium upgrade (offer page)";
    case "premium-account": return "Premium upgrade (from the account)";
    case "fleet": return "Curri fleet joining fee";
    default: return "Verified listing or Premium upgrade (Stripe couldn't be checked)";
  }
}

const isPremium = (p: Product) => p === "premium-offer" || p === "premium-account";

/** Which refund wording the buyer was shown, from the purchase moment. */
function wordingShown(product: Product, at: Date): string {
  if (product === "fleet") return "Fleet \"make it back\" terms (FLEET in src/lib/pricing.ts) — not covered by the listing/Premium template.";
  if (Math.abs(at.getTime() - SEVEN_DAY_WORDING_LIVE_AT.getTime()) < DEPLOY_FUZZ_MS) {
    return "CHECK — bought within 30 minutes of the Oct 10 deploy that switched the wording; it may have said 30-day money-back or 7 days. Rely on the checkbox line below.";
  }
  return at < SEVEN_DAY_WORDING_LIVE_AT
    ? "\"30-day money-back guarantee\" on the pages and in the purchase email (no checkbox, no \"non-refundable\" clause)."
    : "7-day refund terms on the pages, and \"non-refundable after 7 days\".";
}

/** Whether the purchase email carried the "Refund terms you agreed to at checkout" line. */
function emailTermsLine(product: Product, at: Date): string {
  if (product === "fleet") return "n/a (fleet email)";
  if (at < SEVEN_DAY_WORDING_LIVE_AT) return "No — the email said \"30-day money-back guarantee\".";
  if (isPremium(product) && at < PREMIUM_TERMS_LIVE_AT) return "No — Premium emails carried the terms only from the Oct 10 (~noon PT) deploy on.";
  if (product === "listing-or-premium") return "Yes for a listing; for Premium only if bought after the Oct 10 (~noon PT) deploy.";
  return "Yes — \"Refund terms you agreed to at checkout …\".";
}

interface StripeFacts {
  product: Product | null;
  consent: "accepted" | "not recorded" | null;
  name: string | null;
  email: string | null;
  phone: string | null;
}

async function stripeFacts(sessionId: string | null): Promise<StripeFacts | null> {
  const stripe = getStripe();
  if (!stripe || !sessionId) return null;
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    const md = s.metadata ?? {};
    const product: Product | null =
      md.type === "fleet" ? "fleet"
      : md.type === "upgrade" ? (md.source === "oto" ? "premium-offer" : "premium-account")
      : md.type === "listing" ? "listing"
      : null;
    return {
      product,
      consent: s.consent?.terms_of_service === "accepted" ? "accepted" : "not recorded",
      name: s.customer_details?.name ?? null,
      email: s.customer_details?.email ?? null,
      phone: s.customer_details?.phone ?? null,
    };
  } catch (e) {
    console.error("[dispute-evidence] Stripe session lookup failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export interface DisputeEvidence {
  name: string;
  email: string;
  text: string;
}

export async function disputeEvidence(userId: string, now = new Date()): Promise<DisputeEvidence | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true, name: true, createdAt: true, mustResetPassword: true, roadmapData: true, fleetJoinedAt: true,
      payments: {
        where: { status: { in: ["PAID", "REFUNDED"] }, type: { in: ["LISTING", "FLEET"] } },
        orderBy: { createdAt: "asc" },
        take: 10,
        select: { amount: true, type: true, status: true, createdAt: true, stripeSessionId: true, stripePaymentIntentId: true },
      },
      driverProfile: {
        select: {
          id: true, firstName: true, lastName: true, phone: true, createdAt: true, verified: true, tier: true,
          primaryService: true, vehicleType: true,
          documents: { select: { kind: true, uploadedAt: true }, orderBy: { uploadedAt: "asc" } },
          trips: { select: { date: true }, orderBy: { date: "asc" } },
        },
      },
    },
  });
  if (!user) return null;

  const p = user.driverProfile;
  const name = (p ? `${p.firstName} ${p.lastName}` : user.name ?? "").trim() || "(no name on file)";
  const lines: string[] = [];
  const add = (s = "") => lines.push(s);

  add(`DISPUTE EVIDENCE — ${name} <${user.email}>`);
  add(`Gathered ${when(now)} from the FlowSync database and Stripe. Check each line before you use it;`);
  add(`delete what doesn't apply. Playbook + template: docs/STRIPE-DISPUTE-RESPONSE.md.`);
  add();

  add("CUSTOMER");
  add(`- Name on the account: ${name}`);
  add(`- Email on the account: ${user.email}`);
  add(`- Phone on the profile: ${p?.phone || "(none)"}`);
  add(`- Account created: ${when(user.createdAt)}`);
  add();

  add("PAYMENTS");
  if (user.payments.length === 0) add("- No listing, Premium or fleet payment recorded on the site for this account.");
  for (const pay of user.payments) {
    const sf = await stripeFacts(pay.stripeSessionId);
    const product: Product = sf?.product ?? (pay.type === "FLEET" ? "fleet" : "listing-or-premium");
    const ageDays = Math.floor((now.getTime() - pay.createdAt.getTime()) / DAY_MS);
    add(`- ${when(pay.createdAt)} · ${usd(pay.amount)} · ${productName(product)} · ${pay.status === "REFUNDED" ? "REFUNDED" : "paid"}`);
    if (product !== "fleet") {
      const days = refundWindowDaysFor(pay.createdAt);
      const closes = new Date(pay.createdAt.getTime() + days * DAY_MS);
      add(`    Refund window: ${days} days — ${closes <= now ? "closed" : "closes"} ${when(closes)}. Today is day ${ageDays} → ${ageDays < days ? "INSIDE the window: concede, don't fight." : "outside the window."}`);
    }
    add(`    Refund wording shown: ${wordingShown(product, pay.createdAt)}`);
    if (product !== "fleet") {
      add(
        `    Stripe checkout checkbox: ${
          sf?.consent === "accepted" ? `ACCEPTED (recorded on the Checkout Session) — "${REFUND_CHECKBOX}"`
          : sf?.consent === "not recorded" ? "not recorded on this session — don't claim it."
          : "couldn't check Stripe — open the Checkout Session and look for consent.terms_of_service."
        }`,
      );
    }
    add(`    Purchase email carried the refund terms: ${emailTermsLine(product, pay.createdAt)}`);
    if (sf && (sf.name || sf.email || sf.phone)) {
      add(`    Details typed at checkout: ${[sf.name, sf.email, sf.phone].filter(Boolean).join(" · ")}`);
    }
    add(`    Stripe: session ${pay.stripeSessionId ?? "(none)"} · payment ${pay.stripePaymentIntentId ?? "(none)"}`);
  }
  add();

  add("ACCESS AND USE (dated)");
  add(`- ${ptDay(user.createdAt)}: account created; welcome email with login sent (check delivery in Resend → Emails).`);
  if (p) {
    const saved = [p.primaryService && `service: ${p.primaryService.toLowerCase().replace(/_/g, " ")}`, p.vehicleType && `vehicle: ${p.vehicleType}`].filter(Boolean);
    add(`- ${ptDay(p.createdAt)}: profile saved${saved.length ? ` (${saved.join(", ")})` : ""}.`);
    for (const d of p.documents) add(`- ${ptDay(d.uploadedAt)}: uploaded ${d.kind.toLowerCase().replace(/_/g, " ")}.`);
    if (p.trips.length > 0) {
      const first = p.trips[0].date, last = p.trips[p.trips.length - 1].date;
      add(`- ${p.trips.length} trip${p.trips.length === 1 ? "" : "s"} logged in the P&L tracker, ${ptDay(first)}${p.trips.length > 1 ? ` to ${ptDay(last)}` : ""}.`);
    }
  } else {
    add("- No profile saved — they never finished setup, so the listing step was theirs to finish. Account and guides were available throughout.");
  }
  const days = [...parseProgress(user.roadmapData).days].sort();
  if (days.length > 0) add(`- ${days.length} Driver Roadmap check-in${days.length === 1 ? "" : "s"}, ${calendarDay(days[0])}${days.length > 1 ? ` to ${calendarDay(days[days.length - 1])}` : ""}.`);
  if (user.payments.length > 1) add("- More than one purchase (see PAYMENTS): they bought more after receiving the first.");
  if (user.fleetJoinedAt) add(`- ${ptDay(user.fleetJoinedAt)}: joined the Curri fleet.`);
  add();

  add("STATUS NOW (no date recorded)");
  add(`- Set their own password (requires signing in): ${user.mustResetPassword ? "NO — still on the temporary password." : "yes."}`);
  add(
    `- Directory listing: ${
      !p ? "not live (no profile)."
      : p.verified ? `live — ${SITE_URL}/d/${p.id} (print it to PDF).`
      : "not live yet — waiting on their profile/documents or your approval."
    }`,
  );
  if (p) add(`- Tier: ${p.tier === "PREMIUM" ? "Premium" : "Verified"}.`);
  add();

  add("NOT RECORDED — never claim these");
  add("- Sign-in times, the moment the password was set, the approval date, guide opens, Telegram.");

  return { name, email: user.email, text: lines.join("\n") };
}
