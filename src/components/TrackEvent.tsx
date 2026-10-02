"use client";

import { useEffect } from "react";

// Fires a single Meta Pixel conversion event on mount (no-op without the pixel).
// `eventId` enables Meta's deduplication so a page refresh, or the server-side
// Conversions API event with the same id (lib/meta-capi.ts), doesn't
// double-count the same purchase. Meta only reads the id from the 4th
// argument — fbq('track', name, data, { eventID }) — not from inside `data`.
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
    const data: Record<string, unknown> = {};
    if (value != null) {
      data.value = value;
      data.currency = currency;
    }
    if (eventId) w.fbq("track", event, data, { eventID: eventId });
    else w.fbq("track", event, data);
  }, [event, value, currency, eventId]);

  return null;
}
