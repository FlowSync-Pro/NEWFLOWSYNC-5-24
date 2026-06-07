import { createHash } from "node:crypto";

// Meta Conversions API (CAPI) — server-side conversion events that bypass
// browser blocking (iOS ATT, Safari ITP, ad blockers). Sends the same Purchase
// events we already fire browser-side, with the same eventID, so Meta merges
// them into one event per conversion (not double-counted).
//
// Required env:
//   META_CAPI_ACCESS_TOKEN  Generated from Meta Business -> Datasets -> Settings
// Optional env:
//   META_CAPI_PIXEL_ID      Defaults to the new pixel (2070476707153491). Set
//                           if you ever generate a CAPI token for a different
//                           pixel (e.g. the old one).
//
// Graceful: when the token isn't set, every send no-ops. When Meta returns an
// error, we log it but never throw — Stripe webhooks must not fail because of
// downstream marketing concerns.

const META_GRAPH_VERSION = "v18.0";
const DEFAULT_PIXEL_ID = "2070476707153491"; // FlowSync NEW DRIVER.COM

const sha256Lower = (s: string) =>
  createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

export interface CapiPurchaseEvent {
  /** Stripe session ID — MUST match the browser pixel's eventID for dedup. */
  eventId: string;
  /** Customer email (we hash it before sending — never sent in plain text). */
  email: string;
  /** Dollar amount, e.g. 17 or 97. */
  value: number;
  /** Defaults to "USD". */
  currency?: string;
  /** Optional — sharpens Meta's match rate when available. */
  firstName?: string;
  lastName?: string;
  /** Optional — the page where conversion happened. */
  sourceUrl?: string;
}

export async function sendCapiPurchase(event: CapiPurchaseEvent): Promise<void> {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) return; // CAPI not configured — silent no-op
  if (!event.email || !event.eventId) return; // can't dedup or match without these

  const pixelId = process.env.META_CAPI_PIXEL_ID || DEFAULT_PIXEL_ID;
  const sourceUrl =
    event.sourceUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://flowsyncdriver.com";

  // Meta requires PII to be SHA-256-hashed and lowercased before transmission.
  const userData: Record<string, string[]> = {
    em: [sha256Lower(event.email)],
  };
  if (event.firstName) userData.fn = [sha256Lower(event.firstName)];
  if (event.lastName) userData.ln = [sha256Lower(event.lastName)];

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId, // browser-pixel eventID match -> dedup
        action_source: "website",
        event_source_url: sourceUrl,
        user_data: userData,
        custom_data: {
          currency: event.currency ?? "USD",
          value: event.value,
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[capi] Purchase ${res.status}: ${detail.slice(0, 300)}`);
    }
  } catch (e) {
    // Network error, DNS, timeout — never propagate to the webhook caller.
    console.error("[capi] Purchase send failed:", e instanceof Error ? e.message : e);
  }
}
