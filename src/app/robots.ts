import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /admin is private. /ring/* only redirects to other people's sites and /api/* is
      // for the widget, so neither is worth crawling. /embed is kept out of the index by
      // its X-Robots-Tag header, which crawlers can only see if it is not blocked here.
      disallow: ["/admin", "/ring/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
