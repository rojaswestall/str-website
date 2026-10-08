import type { NextConfig } from "next";
import { contentSecurityPolicy, CSP_REPORT_ONLY_HEADER } from "./lib/csp";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Playwright builds a second, live-mode copy of the site next to the default one.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Report-only until step 14 has watched the console on the live site.
          { key: CSP_REPORT_ONLY_HEADER, value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
