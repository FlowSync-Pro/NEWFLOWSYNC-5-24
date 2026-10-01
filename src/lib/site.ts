export const SITE_NAME = "FlowSync";

// The canonical production domain for this site. Distinct from the existing
// flowsyncdrivers.com. Override per-environment with NEXT_PUBLIC_SITE_URL.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://flowsyncdriver.com";

// Support / contact address shown in the footer, on checkout next to the
// guarantee, and on the legal pages. Must be a mailbox someone actually reads —
// the previous addresses (drivers@flowsyncpro.io, support@flowsyncpro.io) are
// dead — never use them — and drivers who can't reach support go to Stripe
// disputes instead. Owner alerts (lib/alerts.ts) also go here.
export const SUPPORT_EMAIL = "support@flowsyncdriver.com";

// Postal address printed in the footer of MARKETING emails (fix 7). The law
// (CAN-SPAM) requires a valid physical postal address in every commercial
// email — a PO box or a registered-agent address works. Marketing email stays
// switched OFF while this is empty; transactional email is unaffected.
export const MARKETING_POSTAL_ADDRESS = "8217 Sheffield Ln, Bakersfield, CA 93311";
