/** The single ring that exists today (see docs/architecture.md). */
export const DEFAULT_RING_ID = "main";

/** Public origin of this site; used for absolute URLs (metadata, sitemap, widget snippets). */
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export const siteConfig = {
  // The name: change it here and it changes everywhere (the 88x31 button is an SVG and needs redrawing).
  name: "Loopback",
  tagline: "A small ring of independent personal websites.",
  description:
    "An independent webring connecting personal websites, blogs, portfolios and digital gardens, with no algorithms and no feeds.",
  nav: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/guidelines", label: "Guidelines" },
    { href: "/join", label: "Join" },
  ],
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
