import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The live site builds into its own directory (NEXT_DIST_DIR=.next-live, set in
  // .env.live) so dev work, tests and the e2e build can never overwrite what pm2 serves.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        // Our pages can't be framed by other sites (clickjacking). /embed is the one
        // page meant to be framed, and /admin has its own, stricter rule below.
        source: "/((?!embed(?:/|$)|admin(?:/|$)).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      {
        // Never cached or indexed, and never framed (clickjacking on the approve buttons).
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
