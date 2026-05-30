// Helpers for the city × service SEO landing pages (the customer-demand engine).
// We only ever build pages for cities that have real verified drivers, so every
// page has genuine local content (no thin "doorway" pages Google penalizes).

import { prisma } from "@/lib/db";

/** "Austin, TX" -> "austin-tx" (URL-safe, lowercase, hyphenated). */
export function citySlug(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Title-case a raw city string for display ("austin tx" -> "Austin Tx"). */
export function cityDisplay(city: string): string {
  return city
    .trim()
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

export interface CityServiceCount {
  city: string; // canonical display string from the DB
  slug: string;
  count: number;
}

/**
 * Distinct cities that have at least one verified driver for a given service
 * enum, with how many. Drives both the landing pages and the sitemap.
 */
export async function citiesForService(serviceEnum: string): Promise<CityServiceCount[]> {
  const rows = await prisma.driverProfile.findMany({
    where: { verified: true, primaryService: serviceEnum as never, city: { not: null } },
    select: { city: true },
  });
  const map = new Map<string, { city: string; count: number }>();
  for (const r of rows) {
    const city = (r.city ?? "").trim();
    if (!city) continue;
    const key = citySlug(city);
    if (!key) continue;
    const cur = map.get(key);
    if (cur) cur.count++;
    else map.set(key, { city, count: 1 });
  }
  return [...map.entries()]
    .map(([slug, v]) => ({ slug, city: v.city, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

/** All city/service combos with verified drivers (for the sitemap + index). */
export async function allCityServiceRoutes(): Promise<{ serviceEnum: string; slug: string }[]> {
  const rows = await prisma.driverProfile.findMany({
    where: { verified: true, city: { not: null } },
    select: { city: true, primaryService: true },
  });
  const seen = new Set<string>();
  const out: { serviceEnum: string; slug: string }[] = [];
  for (const r of rows) {
    const slug = citySlug(r.city ?? "");
    if (!slug) continue;
    const key = `${r.primaryService}:${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ serviceEnum: r.primaryService, slug });
  }
  return out;
}
