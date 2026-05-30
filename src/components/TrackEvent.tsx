"use client";

import { useEffect } from "react";

// Fires a single Meta Pixel conversion event on mount (no-op without the pixel).
// `eventId` enables Meta's deduplication so a page refresh (or a future
// server-side Conversions API event) doesn't double-count the same purchase.
export default function TrackEvent({
  event,
  value,
  currency = "USD",
  eventId,
}: {
  event: "Purchase" | "CompleteRegistration" | "Lead";
  value?: number;
  currency?: string;
  eventId?: string;
}) {
  useEffect(() => {
    const w = window as unknown as { fbq?: (...a: unknown[]) => void };
    if (!w.fbq) return;
    const args: unknown[] = ["track", event];
    if (value != null) args.push({ value, currency });
    else if (eventId) args.push({});
    if (eventId) args.push({ eventID: eventId });
    w.fbq(...args);
  }, [event, value, currency, eventId]);

  return null;
}
