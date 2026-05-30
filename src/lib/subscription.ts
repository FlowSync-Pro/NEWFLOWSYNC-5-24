// Entitlement check for the P&L Tracker Pro subscription.
// Stripe statuses "trialing" (the free first month) and "active" both grant access;
// anything else (canceled, past_due, unpaid, incomplete) locks the cloud features.
export function pnlProActive(status?: string | null): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "trialing" || s === "active";
}
