import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // App/admin pages, not meant for indexing.
      disallow: ["/profile", "/dashboard", "/account", "/admin", "/signin", "/reset-password", "/forgot-password", "/book"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
