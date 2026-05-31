export const SITE_NAME = "FlowSync";

// The canonical production domain for this site. Distinct from the existing
// flowsyncdrivers.com. Override per-environment with NEXT_PUBLIC_SITE_URL.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://flowsyncdriver.com";

// Support / contact address shown in the footer, on checkout next to the
// guarantee, and on the legal pages.
export const SUPPORT_EMAIL = "drivers@flowsyncpro.io";
