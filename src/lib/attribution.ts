// First-touch attribution — where a buyer came from.
//
// On a visitor's first page view, AttributionCapture (client) stores what the
// browser can see into one first-party cookie: the referring site, any UTM
// tags on the link, Facebook's click id, the landing page, and when. At
// checkout the server copies it (plus the two cookies the Meta pixel sets)
// into the Stripe Checkout Session's metadata, so every payment in Stripe
// says where it came from. The webhook forwards the Meta keys to the
// Conversions API so Meta can attribute the purchase to the ad.
//
// No personal data goes in the cookie: hostnames, campaign labels, a path,
// an opaque click id, a timestamp. Nothing here ever throws — attribution is
// a nice-to-have and must never block a page or a sale.

export const ATTRIBUTION_COOKIE = "fs_attr";
export const ATTRIBUTION_COOKIE_DAYS = 30;

/** What the cookie holds (short keys — cookies are sent on every request). */
export interface Attribution {
  /** utm_source, e.g. "ig", "fb", "email" */
  src?: string;
  /** utm_medium, e.g. "paid", "reel", "newsletter" */
  med?: string;
  /** utm_campaign */
  cmp?: string;
  /** utm_content (which ad / which link) */
  cnt?: string;
  /** Referring site's hostname, e.g. "l.instagram.com" */
  ref?: string;
  /** Landing page path, no query string */
  lp?: string;
  /** Facebook click id (fbclid) */
  fbclid?: string;
  /** First seen, ISO timestamp */
  t?: string;
}

const UTM: [keyof Attribution, string][] = [
  ["src", "utm_source"],
  ["med", "utm_medium"],
  ["cmp", "utm_campaign"],
  ["cnt", "utm_content"],
];

const clip = (s: string, n = 200) => s.trim().slice(0, n);

/** Build the first-touch record from a landing URL and the referrer (client side). */
export function buildAttribution(input: { href: string; referrer: string; now?: Date }): Attribution {
  const out: Attribution = {};
  try {
    const url = new URL(input.href);
    for (const [key, param] of UTM) {
      const v = url.searchParams.get(param);
      if (v) out[key] = clip(v);
    }
    const fbclid = url.searchParams.get("fbclid");
    if (fbclid) out.fbclid = clip(fbclid, 500);
    out.lp = clip(url.pathname, 120);
    if (input.referrer) {
      const host = new URL(input.referrer).hostname;
      // Our own pages linking to each other aren't a source.
      if (host && host !== url.hostname) out.ref = clip(host, 120);
    }
  } catch {
    // Malformed URL — keep whatever was parsed.
  }
  out.t = (input.now ?? new Date()).toISOString();
  return out;
}

/** Parse the cookie value; anything odd yields an empty record. */
export function parseAttribution(raw: string | undefined): Attribution {
  if (!raw) return {};
  try {
    const obj = JSON.parse(decodeURIComponent(raw));
    if (!obj || typeof obj !== "object") return {};
    const out: Attribution = {};
    for (const k of ["src", "med", "cmp", "cnt", "ref", "lp", "fbclid", "t"] as const) {
      if (typeof obj[k] === "string" && obj[k]) out[k] = clip(obj[k], 500);
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeAttribution(a: Attribution): string {
  return encodeURIComponent(JSON.stringify(a));
}

/**
 * Stripe metadata for a checkout: readable keys for the Stripe dashboard, plus
 * Meta's browser match keys. Stripe allows 50 keys of 500 chars — well within.
 * `fbc` falls back to the documented fb.1.<ms>.<fbclid> form when the pixel
 * didn't set its own cookie (blocked script) but the click id was on the URL.
 */
export function attributionMetadata(cookies: { get(name: string): { value: string } | undefined }): Record<string, string> {
  const md: Record<string, string> = {};
  try {
    const a = parseAttribution(cookies.get(ATTRIBUTION_COOKIE)?.value);
    const put = (key: string, v?: string) => { if (v) md[key] = clip(v, 500); };
    put("attr_source", a.src);
    put("attr_medium", a.med);
    put("attr_campaign", a.cmp);
    put("attr_content", a.cnt);
    put("attr_referrer", a.ref);
    put("attr_landing", a.lp);
    put("attr_fbclid", a.fbclid);
    put("attr_first_seen", a.t);
    put("fbp", cookies.get("_fbp")?.value);
    const fbc = cookies.get("_fbc")?.value;
    if (fbc) put("fbc", fbc);
    else if (a.fbclid) put("fbc", `fb.1.${a.t ? Date.parse(a.t) || Date.now() : Date.now()}.${a.fbclid}`);
  } catch {
    // Never let attribution break a checkout.
  }
  return md;
}
