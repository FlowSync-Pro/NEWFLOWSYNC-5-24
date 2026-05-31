import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { prisma } from "@/lib/db";
import { allCityServiceRoutes } from "@/lib/locations";
import { serviceFromEnum } from "@/lib/enums";

// Generated on-demand (not at build) so it never needs the DB during `next build`
// and always reflects currently listed drivers.
export const dynamic = "force-dynamic";

async function listedDrivers(): Promise<{ id: string; updatedAt: Date }[]> {
  try {
    return await prisma.driverProfile.findMany({
      where: { listedAt: { not: null } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
  } catch {
    // No DB at build time — emit the static routes only.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    "",
    "/find-a-driver",
    "/services",
    "/drivers",
    "/how-it-works",
    "/pricing",
    "/calculator",
    "/tools/profit-loss",
    "/signup",
  ];
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));

  const drivers = await listedDrivers();
  const driverEntries: MetadataRoute.Sitemap = drivers.map((d) => ({
    url: `${SITE_URL}/d/${d.id}`,
    lastModified: d.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // City × service landing pages (the demand engine) — only real combos.
  let cityEntries: MetadataRoute.Sitemap = [];
  try {
    const combos = await allCityServiceRoutes();
    cityEntries = combos.map(({ serviceEnum, slug }) => ({
      url: `${SITE_URL}/delivery/${serviceFromEnum(serviceEnum as never)}/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // No DB at build — skip; force-dynamic regenerates with data at runtime.
  }

  return [...staticEntries, ...driverEntries, ...cityEntries];
}
