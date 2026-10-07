"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createExpressDashboardLink, createOnboardingLink, ensureConnectAccount } from "@/lib/stripe-connect";

// Driver-side Stripe Connect actions for the Payouts page (fleet members only).
// Both end in a redirect: to Stripe on success, back to the page with a short
// error code on failure (the page turns the code into a sentence).

async function fleetUser() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fleetJoinedAt: true, stripeConnectAccountId: true, stripeConnectPayoutsEnabled: true },
  });
  if (!user?.fleetJoinedAt) redirect("/account/curri-fleet");
  return user;
}

/** "Set up payouts with Stripe" / "Continue setup": make the account if needed, then send them into Stripe's form. */
export async function startPayoutsOnboarding(): Promise<void> {
  const user = await fleetUser();
  let url: string | null = null;
  try {
    const acct = await ensureConnectAccount(user.id);
    if (acct.ok) url = await createOnboardingLink(acct.accountId);
  } catch (e) {
    console.error("[connect] onboarding start failed:", e instanceof Error ? e.message : e);
  }
  redirect(url ?? "/account/payouts?error=stripe");
}

/** "Manage in Stripe": one-time login to the driver's own Stripe Express dashboard. */
export async function openStripeDashboard(): Promise<void> {
  const user = await fleetUser();
  const url = user.stripeConnectAccountId ? await createExpressDashboardLink(user.stripeConnectAccountId) : null;
  redirect(url ?? "/account/payouts?error=dashboard");
}
