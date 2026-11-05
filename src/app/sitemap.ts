import type { MetadataRoute } from "next";
import { SITE_URL, siteConfig } from "@/config/site";
import { listActiveMembers } from "@/server/member-repository";

/**
 * Public pages plus one page per active member. Static pages carry no
 * lastModified (we can't know it, and a made-up one is worse than none); a
 * member page's is the day they joined.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [...siteConfig.nav.map((item) => item.href), "/widget"];
  const members = await listActiveMembers();
  return [
    ...pages.map((href) => ({ url: `${SITE_URL}${href}` })),
    ...members.map((m) => ({
      url: `${SITE_URL}/members/${m.id}`,
      lastModified: m.joinedAt,
    })),
  ];
}
