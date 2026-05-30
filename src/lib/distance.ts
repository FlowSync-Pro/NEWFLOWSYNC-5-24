// Driving distance via Google Distance Matrix API. Server-only.
// Uses GOOGLE_MAPS_API_KEY (preferred, server-restricted) or falls back to the
// public maps key. Returns miles, or null if not configured / lookup failed.

export function mapsKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
}

export async function drivingMiles(origin: string, destination: string): Promise<number | null> {
  const key = mapsKey();
  if (!key || !origin?.trim() || !destination?.trim()) return null;

  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?units=imperial&origins=${encodeURIComponent(origin)}` +
    `&destinations=${encodeURIComponent(destination)}&key=${key}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    const el = data?.rows?.[0]?.elements?.[0];
    if (data?.status !== "OK" || el?.status !== "OK" || !el?.distance?.value) return null;
    return Math.round((el.distance.value / 1609.344) * 10) / 10; // meters -> miles, 1dp
  } catch {
    return null;
  }
}
