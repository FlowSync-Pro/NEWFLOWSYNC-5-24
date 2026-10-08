import centroids from "@/data/zip-centroids.json";
import places from "@/data/place-centroids.json";

// ZIP-code geography with no outside service: the US Census ZCTA gazetteer
// (public domain) reduced to {zip: [lat, lng]} in src/data/zip-centroids.json.
// Good enough to know which drivers are near a pickup; real driving distance
// is a later stage (docs/DISPATCH-FLOW.md).

const TABLE = centroids as unknown as Record<string, [number, number]>;

/** "93701", " 93701-1234 " → "93701"; anything else → null. */
export function normalizeZip(input: string | null | undefined): string | null {
  const m = /^\s*(\d{5})(?:-\d{4})?\s*$/.exec(input ?? "");
  return m ? m[1] : null;
}

export function zipCentroid(zip: string | null | undefined): { lat: number; lng: number } | null {
  const z = normalizeZip(zip);
  const row = z ? TABLE[z] : undefined;
  return row ? { lat: row[0], lng: row[1] } : null;
}

/** Straight-line distance between two points, in miles. */
export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Miles between two ZIPs, or null when either is unknown. */
export function zipMiles(zipA: string | null | undefined, zipB: string | null | undefined): number | null {
  const a = zipCentroid(zipA);
  const b = zipCentroid(zipB);
  return a && b ? haversineMiles(a, b) : null;
}

// ---- Places (city centres) — Curri's emails name cities, not ZIPs ----------

const PLACES = places as unknown as Record<string, Record<string, [number, number]>>;

const normCity = (s: string) => s.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");

export interface PlaceMatch { city: string; state: string; lat: number; lng: number }

/** "Santa Fe Springs", "CA" → one match; unknown → null. */
export function placeCentroid(city: string, state: string): PlaceMatch | null {
  const st = state.trim().toUpperCase();
  const row = PLACES[st]?.[normCity(city)];
  return row ? { city: titleCase(normCity(city)), state: st, lat: row[0], lng: row[1] } : null;
}

/** Every state that has a place with this name (for a city given without a state). */
export function placeCandidates(city: string): PlaceMatch[] {
  const key = normCity(city);
  const out: PlaceMatch[] = [];
  for (const [st, table] of Object.entries(PLACES)) {
    const row = table[key];
    if (row) out.push({ city: titleCase(key), state: st, lat: row[0], lng: row[1] });
  }
  return out;
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * A location key as the board stores it: a 5-digit ZIP, "City, ST", or just
 * "City" (Curri's emails). Returns coordinates, or null when unknown. For a bare
 * city that exists in several states, `near` (e.g. the fleet's base points)
 * picks the closest one; otherwise the first match wins.
 */
export function locate(key: string | null | undefined, near: { lat: number; lng: number }[] = []): { lat: number; lng: number; label: string } | null {
  if (!key) return null;
  const zip = normalizeZip(key);
  if (zip) {
    const c = zipCentroid(zip);
    return c ? { ...c, label: zip } : null;
  }
  const m = /^\s*([^,]+?)\s*,\s*([A-Za-z]{2})\s*$/.exec(key);
  if (m) {
    const p = placeCentroid(m[1], m[2]);
    return p ? { lat: p.lat, lng: p.lng, label: `${p.city}, ${p.state}` } : null;
  }
  const cands = placeCandidates(key);
  if (cands.length === 0) return null;
  let best = cands[0];
  if (near.length && cands.length > 1) {
    let bestD = Infinity;
    for (const c of cands) {
      const d = Math.min(...near.map((n) => haversineMiles(n, c)));
      if (d < bestD) { bestD = d; best = c; }
    }
  }
  return { lat: best.lat, lng: best.lng, label: `${best.city}, ${best.state}` };
}
