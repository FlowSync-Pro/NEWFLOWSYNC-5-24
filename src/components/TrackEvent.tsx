"use client";

import { useEffect } from "react";

// Fires a single Meta Pixel conversion event on mount (no-op without the pixel).
export default function TrackEvent({
  event,
  value,
  currency = "USD",
}: {
  event: "Purchase" | "CompleteRegistration" | "Lead";
  value?: number;
  currency?: string;
}) {
  useEffect(() => {
    const w = window as unknown as { fbq?: (...a: unknown[]) => void };
    if (!w.fbq) return;
    w.fbq("track", event, value != null ? { value, currency } : undefined);
  }, [event, value, currency]);

  return null;
}
