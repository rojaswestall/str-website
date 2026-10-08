import type { NextConfig } from "next";
import { contentSecurityPolicy, CSP_REPORT_ONLY_HEADER } from "./lib/csp";

// Playwright builds a second, live-mode copy of the site next to the default one.
const distDir = process.env.NEXT_DIST_DIR ?? ".next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  distDir,
  // The live copy type-checks against its own generated types (tsconfig.live.json),
  // so a stale `.next-live` cannot break the default build or `pnpm typecheck`.
  typescript: {
    tsconfigPath:
      distDir === ".next-live" ? "tsconfig.live.json" : "tsconfig.json",
  },
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
