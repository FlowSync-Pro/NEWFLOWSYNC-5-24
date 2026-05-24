import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GUIDES } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
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
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : route.startsWith("/grow/") ? 0.6 : 0.7,
  }));
}
