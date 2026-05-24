export const SITE_NAME = "FlowSync";

// The canonical production domain for this site. Distinct from the existing
// flowsyncdrivers.com. Override per-environment with NEXT_PUBLIC_SITE_URL.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://flowsyncdriver.com";
