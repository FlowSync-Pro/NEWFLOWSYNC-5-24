"use client";

import { useEffect } from "react";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_COOKIE_DAYS, buildAttribution, serializeAttribution } from "@/lib/attribution";

// Records where a visitor FIRST came from (referrer, UTM tags, Facebook click
// id, landing page) in a first-party cookie, once. Renders nothing. Every
// step is wrapped so a blocked cookie or an odd URL can never affect the page.
export default function AttributionCapture() {
  useEffect(() => {
    try {
      if (document.cookie.split("; ").some((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`))) return; // first touch only
      const value = serializeAttribution(buildAttribution({ href: location.href, referrer: document.referrer }));
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${ATTRIBUTION_COOKIE}=${value}; Max-Age=${ATTRIBUTION_COOKIE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
    } catch {
      // Cookies blocked or storage disabled — nothing to do.
    }
  }, []);
  return null;
}
