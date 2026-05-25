import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GUIDES } from "@/lib/guides";
import { prisma } from "@/lib/db";

// Regenerate periodically so newly listed drivers appear without a redeploy.
export const revalidate = 3600;

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
    "/grow",
    "/pricing",
    "/calculator",
    "/tools/profit-loss",
    "/signup",
    ...GUIDES.map((g) => `/grow/${g.slug}`),
  ];
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : route.startsWith("/grow/") ? 0.6 : 0.7,
  }));

  const drivers = await listedDrivers();
  const driverEntries: MetadataRoute.Sitemap = drivers.map((d) => ({
    url: `${SITE_URL}/d/${d.id}`,
    lastModified: d.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...driverEntries];
}
