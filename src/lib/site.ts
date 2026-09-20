export const SITE_NAME = "FlowSync";

// The canonical production domain for this site. Distinct from the existing
// flowsyncdrivers.com. Override per-environment with NEXT_PUBLIC_SITE_URL.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://flowsyncdriver.com";

// Support / contact address shown in the footer, on checkout next to the
// guarantee, and on the legal pages. Must be a mailbox someone actually reads —
// the previous address (drivers@flowsyncpro.io) wasn't receiving mail, and
// drivers who can't reach support go to Stripe disputes instead.
export const SUPPORT_EMAIL = "support@flowsyncdriver.com";
