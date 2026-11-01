import type { MetadataRoute } from "next";
import { SITE_URL, siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return siteConfig.nav.map((item) => ({ url: `${SITE_URL}${item.href}` }))
    .concat([{ url: `${SITE_URL}/widget` }]);
}
