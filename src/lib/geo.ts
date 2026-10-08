import centroids from "@/data/zip-centroids.json";

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
