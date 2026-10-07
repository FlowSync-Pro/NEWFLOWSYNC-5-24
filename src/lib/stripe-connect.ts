import { prisma } from "./db";
import { getStripe } from "./stripe";
import { SITE_URL } from "./site";
import { alertOwner } from "./alerts";

// Stripe Connect (Express) for fleet payouts.
//
// Each fleet driver gets their own Express account under the FlowSync Stripe
// account (the platform). Stripe's hosted onboarding collects their bank and
// tax details and runs identity checks; Stripe issues the 1099 at year end.
// Phase 1 (this file): create the account, hand the driver an onboarding
// link, mirror Stripe's status. Phase 2 (later): transfers per delivery.
//
// Graceful: without STRIPE_SECRET_KEY every call reports "not configured";
// status syncs never throw (a Stripe hiccup must not break a page).

export type ConnectStatus = "not-started" | "in-progress" | "ready";

export const CONNECT_STATUS_LABEL: Record<ConnectStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress — Stripe still needs details",
  ready: "Ready — payouts enabled",
};

export function connectStatus(u: { stripeConnectAccountId: string | null; stripeConnectPayoutsEnabled: boolean }): ConnectStatus {
  if (!u.stripeConnectAccountId) return "not-started";
  return u.stripeConnectPayoutsEnabled ? "ready" : "in-progress";
}

const base = () => process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;

/**
 * The driver's Express account id, creating the account on first call.
 * Fleet members only. Safe to call twice: a second concurrent call finds the
 * id the first one stored (the loser's spare account is logged, never used).
 */
export async function ensureConnectAccount(userId: string): Promise<{ ok: true; accountId: string; created: boolean } | { ok: false; error: string }> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Stripe isn't configured." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fleetJoinedAt: true, stripeConnectAccountId: true, driverProfile: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!user) return { ok: false, error: "Driver not found." };
  if (!user.fleetJoinedAt) return { ok: false, error: "Not a fleet member." };
  if (user.stripeConnectAccountId) return { ok: true, accountId: user.stripeConnectAccountId, created: false };

  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: user.email,
    business_type: "individual",
    capabilities: { transfers: { requested: true } },
    individual: {
      email: user.email,
      ...(user.driverProfile?.firstName ? { first_name: user.driverProfile.firstName } : {}),
      ...(user.driverProfile?.lastName ? { last_name: user.driverProfile.lastName } : {}),
    },
    business_profile: {
      product_description: "Independent contractor delivery driver, paid per completed delivery by Barham Transport LLC (FlowSync Drivers).",
    },
    metadata: { userId, driverProfileId: user.driverProfile?.id ?? "" },
  });

  const claimed = await prisma.user.updateMany({
    where: { id: userId, stripeConnectAccountId: null },
    data: { stripeConnectAccountId: account.id },
  });
  if (claimed.count === 0) {
    // Someone else stored an id in the meantime — use theirs.
    const again = await prisma.user.findUnique({ where: { id: userId }, select: { stripeConnectAccountId: true } });
    console.error(`[connect] duplicate account ${account.id} for user ${userId} (kept ${again?.stripeConnectAccountId}); delete the spare in Stripe → Connect → Accounts`);
    if (again?.stripeConnectAccountId) return { ok: true, accountId: again.stripeConnectAccountId, created: false };
  }
  return { ok: true, accountId: account.id, created: true };
}

/** A fresh onboarding link (they expire in minutes — generate on click, never store). */
export async function createOnboardingLink(accountId: string): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${base()}/account/payouts?refresh=1`,
    return_url: `${base()}/account/payouts?return=1`,
  });
  return link.url;
}

/** A one-time login link to the driver's Express dashboard (balance, payouts, tax forms). */
export async function createExpressDashboardLink(accountId: string): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const link = await stripe.accounts.createLoginLink(accountId);
    return link.url;
  } catch (e) {
    console.error("[connect] login link failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export interface ConnectSync {
  status: ConnectStatus;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  /** Fields Stripe is still waiting on (currently_due), for the admin view. */
  requirementsDue: string[];
}

/**
 * Ask Stripe how the driver's account stands and mirror it on the user. The
 * owner gets an email the first time payouts become enabled. Returns null
 * (and leaves the row alone) when Stripe can't be reached.
 */
export async function syncConnectStatus(userId: string): Promise<ConnectSync | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, stripeConnectAccountId: true, stripeConnectOnboardedAt: true, stripeConnectPayoutsEnabled: true, driverProfile: { select: { firstName: true, lastName: true } } },
  });
  if (!user?.stripeConnectAccountId) return null;
  try {
    const acct = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    const payoutsEnabled = !!acct.payouts_enabled;
    const detailsSubmitted = !!acct.details_submitted;
    const requirementsDue = acct.requirements?.currently_due ?? [];
    const becameReady = payoutsEnabled && !user.stripeConnectPayoutsEnabled;
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeConnectPayoutsEnabled: payoutsEnabled,
        ...(detailsSubmitted && !user.stripeConnectOnboardedAt ? { stripeConnectOnboardedAt: new Date() } : {}),
      },
    });
    if (becameReady) {
      const name = `${user.driverProfile?.firstName ?? ""} ${user.driverProfile?.lastName ?? ""}`.trim() || user.email;
      await alertOwner(`${name} (${user.email}) finished Stripe payouts setup — you can pay them by transfer now.`);
    }
    return { status: payoutsEnabled ? "ready" : "in-progress", payoutsEnabled, detailsSubmitted, requirementsDue };
  } catch (e) {
    console.error("[connect] status sync failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
