"use client";

import { useEffect } from "react";

/**
 * Remembers a referral code from the URL (?ref=CODE) on this device, under the
 * same key the pricing page uses, so a checkout later in the visit — like the
 * homepage fleet checkout — credits the driver who shared the link.
 */
export default function RefCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref")?.trim().slice(0, 16);
      if (ref) localStorage.setItem("fs_ref", ref);
    } catch {
      // storage blocked — the referral just isn't remembered
    }
  }, []);
  return null;
}
