import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/customers",
        "/projects",
        "/estimates",
        "/proposals",
        "/analytics",
        "/settings",
        "/ai",
        "/api/",
        "/auth/",
        "/invite/",
        "/p/",
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
