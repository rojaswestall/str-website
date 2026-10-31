import type { NextConfig } from "next";
import { contentSecurityPolicy, CSP_REPORT_ONLY_HEADER } from "./lib/csp";

// Playwright builds live-mode and native-mode copies of the site next to the
// default one; each type-checks against its own generated types so a stale
// extra build directory cannot break the default build or `pnpm typecheck`.
const distDir = process.env.NEXT_DIST_DIR ?? ".next";
const TSCONFIG_BY_DIST: Record<string, string> = {
  ".next-live": "tsconfig.live.json",
  ".next-native": "tsconfig.native.json",
};

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  distDir,
  typescript: {
    tsconfigPath: TSCONFIG_BY_DIST[distDir] ?? "tsconfig.json",
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
