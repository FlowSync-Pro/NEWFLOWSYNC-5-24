import type { PayPlan, PayoutStatus } from "@prisma/client";
import { prisma } from "./db";
import { getStripe } from "./stripe";
import { FLEET } from "./pricing";
import { SITE_URL } from "./site";
import { alertIfEmailFailed, alertOwner } from "./alerts";
import { sendPayoutReceiptEmail } from "./email";
import { syncConnectStatus } from "./stripe-connect";

// Fleet payouts (Stripe Connect phase 2).
//
// The owner logs each completed delivery with what Curri paid for the load.
// The fee (15% standard / 20% faster, from lib/pricing.ts) comes off, and the
// net is what moves — by Stripe transfer from the FlowSync balance to the
// driver's Express account — when the owner pays it: on Friday for STANDARD
// drivers, right away for FASTER ones. Every payout is one row here, never
// edited after logging, so a retry is safe: Stripe is given the row id as
// the idempotency key and returns the same transfer instead of a second one.

/** Nothing above this moves in one transfer — a typo guard (owner decision, 2026-10-07). */
export const PAYOUT_CAP_CENTS = 1_500_00;

export function feePercentFor(plan: PayPlan): number {
  return plan === "FASTER" ? FLEET.fastPayoutFeePercent : FLEET.dispatchFeePercent;
}

/** Fee rounded to the cent; the driver gets the rest. */
export function splitLoad(loadCents: number, feePercent: number): { feeCents: number; netCents: number } {
  const feeCents = Math.round((loadCents * feePercent) / 100);
  return { feeCents, netCents: loadCents - feeCents };
}

/** "123.45" → 12345; rejects anything that isn't a positive dollar amount. */
export function parseDollars(input: string): number | null {
  const s = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return cents > 0 ? cents : null;
}

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export interface LogDeliveryInput {
  userId: string;
  loadCents: number;
  /** Calendar date of the delivery. */
  deliveredOn: Date;
  note?: string;
  createdById?: string;
}

/** Record a completed delivery as a PENDING payout (fee from the driver's plan at this moment). */
export async function logDelivery(input: LogDeliveryInput): Promise<{ ok: true; payoutId: string; netCents: number } | { ok: false; error: string }> {
  if (!Number.isInteger(input.loadCents) || input.loadCents <= 0) return { ok: false, error: "Enter the load amount in dollars, e.g. 145.00." };
  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { fleetJoinedAt: true, payPlan: true } });
  if (!user) return { ok: false, error: "Driver not found." };
  if (!user.fleetJoinedAt) return { ok: false, error: "Not a fleet member." };
  const feePercent = feePercentFor(user.payPlan);
  const { feeCents, netCents } = splitLoad(input.loadCents, feePercent);
  if (netCents > PAYOUT_CAP_CENTS) {
    return { ok: false, error: `That nets $${(netCents / 100).toFixed(2)} — over the $${PAYOUT_CAP_CENTS / 100} per-transfer cap. Split it into two deliveries or raise the cap in lib/payouts.ts.` };
  }
  const payout = await prisma.driverPayout.create({
    data: {
      userId: input.userId,
      loadCents: input.loadCents,
      feePercent,
      feeCents,
      netCents,
      note: input.note?.trim().slice(0, 200) || null,
      deliveredOn: input.deliveredOn,
      createdById: input.createdById ?? null,
    },
    select: { id: true, netCents: true },
  });
  return { ok: true, payoutId: payout.id, netCents: payout.netCents };
}

export type PayResult = { ok: true; alreadyPaid: boolean; netCents: number } | { ok: false; error: string };

/**
 * Move the net for one payout to the driver's Stripe account. Pays PENDING
 * or FAILED rows only; refuses unless Stripe says the driver's account is
 * ready (checked live). On a Stripe error the row becomes FAILED with the
 * reason and the owner is emailed — nothing is marked paid that wasn't.
 */
export async function payPayout(payoutId: string): Promise<PayResult> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Stripe isn't configured." };

  const p = await prisma.driverPayout.findUnique({
    where: { id: payoutId },
    include: { user: { select: { id: true, email: true, stripeConnectAccountId: true, driverProfile: { select: { firstName: true, lastName: true } } } } },
  });
  if (!p) return { ok: false, error: "Payout not found." };
  if (p.status === "PAID") return { ok: true, alreadyPaid: true, netCents: p.netCents };
  if (p.status === "CANCELLED") return { ok: false, error: "This payout was cancelled." };
  if (p.netCents <= 0 || p.netCents > PAYOUT_CAP_CENTS) return { ok: false, error: `Net $${(p.netCents / 100).toFixed(2)} is outside the allowed range (cap $${PAYOUT_CAP_CENTS / 100}).` };

  const name = `${p.user.driverProfile?.firstName ?? ""} ${p.user.driverProfile?.lastName ?? ""}`.trim() || p.user.email;
  const sync = await syncConnectStatus(p.user.id);
  if (!p.user.stripeConnectAccountId || !sync?.payoutsEnabled) {
    return { ok: false, error: `${name}'s Stripe payouts aren't ready yet (${sync ? "Stripe still needs details" : "couldn't reach Stripe"}). Nothing was sent.` };
  }

  const when = p.deliveredOn.toISOString().slice(0, 10);
  try {
    const transfer = await stripe.transfers.create(
      {
        amount: p.netCents,
        currency: "usd",
        destination: p.user.stripeConnectAccountId,
        description: `Delivery ${when}${p.note ? ` — ${p.note}` : ""} (load $${(p.loadCents / 100).toFixed(2)}, ${p.feePercent}% fee)`,
        transfer_group: p.id,
        metadata: { payoutId: p.id, userId: p.user.id, loadCents: String(p.loadCents), feePercent: String(p.feePercent) },
      },
      { idempotencyKey: `payout-${p.id}` },
    );
    await prisma.driverPayout.update({
      where: { id: p.id },
      data: { status: "PAID", stripeTransferId: transfer.id, paidAt: new Date(), failureReason: null },
    });
  } catch (e) {
    const reason = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    await prisma.driverPayout.update({ where: { id: p.id }, data: { status: "FAILED", failureReason: reason } });
    await alertOwner(`Payout to ${name} (${p.user.email}) for $${(p.netCents / 100).toFixed(2)} FAILED — Stripe said: ${reason}. Nothing was sent; retry from /admin/payouts.`);
    return { ok: false, error: `Stripe said: ${reason}` };
  }

  const res = await sendPayoutReceiptEmail({
    to: p.user.email,
    firstName: p.user.driverProfile?.firstName || "there",
    netCents: p.netCents,
    loadCents: p.loadCents,
    feePercent: p.feePercent,
    feeCents: p.feeCents,
    deliveredOn: p.deliveredOn,
    note: p.note,
    payoutsUrl: `${process.env.NEXT_PUBLIC_SITE_URL || SITE_URL}/account/payouts`,
  });
  await alertIfEmailFailed(res);
  return { ok: true, alreadyPaid: false, netCents: p.netCents };
}

export interface PayAllSummary {
  paid: number;
  paidCents: number;
  failed: { payoutId: string; driver: string; error: string }[];
}

/** Friday: pay every PENDING payout, one by one (a failure never stops the rest). */
export async function payAllPending(): Promise<PayAllSummary> {
  const pending = await prisma.driverPayout.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true, user: { select: { email: true, driverProfile: { select: { firstName: true, lastName: true } } } } },
  });
  const summary: PayAllSummary = { paid: 0, paidCents: 0, failed: [] };
  for (const row of pending) {
    const driver = `${row.user.driverProfile?.firstName ?? ""} ${row.user.driverProfile?.lastName ?? ""}`.trim() || row.user.email;
    const r = await payPayout(row.id);
    if (r.ok) {
      summary.paid++;
      summary.paidCents += r.netCents;
    } else {
      summary.failed.push({ payoutId: row.id, driver, error: r.error });
    }
  }
  return summary;
}

/** A mis-logged delivery: PENDING or FAILED → CANCELLED. Paid rows can't be cancelled (refund in Stripe instead). */
export async function cancelPayout(payoutId: string): Promise<{ ok: boolean; error?: string }> {
  const r = await prisma.driverPayout.updateMany({
    where: { id: payoutId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "CANCELLED" },
  });
  return r.count === 1 ? { ok: true } : { ok: false, error: "Only a pending or failed payout can be cancelled." };
}
