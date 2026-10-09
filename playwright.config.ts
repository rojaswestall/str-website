import { defineConfig, devices } from "@playwright/test";

/*
 * Two Chromium projects, each against its own production build. The dev
 * server is never used: with Cache Components the two behave differently
 * (see the step 9 notes on the 404 status in docs/plan.md).
 *
 * `chromium` (port 3000, default build, NEXT_PUBLIC_HOSPITABLE_MODE=stub)
 * runs every spec except `*.live.spec.ts`:
 *   home.spec.ts          the landing page, its sections, and the site shell
 *   stays.spec.ts         the three house pages, the stub per house, both 404s
 *   theme.spec.ts         system preference, toggle, persistence, fonts
 *   contact-api.spec.ts   POST /api/contact through the `request` fixture
 *   contact-form.spec.ts  the form in the browser against the real route
 *   hospitable.spec.ts    stub mode makes no loader request; the CSP header
 *   seo.spec.ts           sitemap, robots, OG images, JSON-LD, canonical tags
 *   kitchen-sink.spec.ts  /kitchen-sink is a 404 in production
 *   (a11y.spec.ts joins this project when step 12 merges.)
 *
 * `chromium-live` (port 3001, a second build with
 * NEXT_PUBLIC_HOSPITABLE_MODE=live into .next-live) runs only
 * hospitable.live.spec.ts: the one place the real loader shape is covered
 * (script attributes, remount on client-side navigation, stub fallback when
 * a house has no property id). The real loader is intercepted, never fetched.
 */

const port = 3000;
const livePort = 3001;
const baseURL = `http://localhost:${port}`;
const liveBaseURL = `http://localhost:${livePort}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  // CI also writes playwright-report/, which ci.yml uploads on failure.
  reporter: isCI
    ? [
        ["github"],
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ]
    : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /\.live\.spec\.ts$/,
    },
    {
      name: "chromium-live",
      use: { ...devices["Desktop Chrome"], baseURL: liveBaseURL },
      testMatch: /\.live\.spec\.ts$/,
    },
  ],
  webServer: [
    // Default build. Two values are pinned so a .env.local cannot change them
    // (an explicit process value wins over .env files): stub mode, so the
    // widgets are the placeholder panels; and an empty NEXT_PUBLIC_SITE_URL,
    // which getSiteUrl() treats as unset, so every absolute URL seo.spec.ts
    // checks resolves to this origin.
    {
      command: `pnpm build && pnpm start --port ${port}`,
      url: baseURL,
      env: { NEXT_PUBLIC_HOSPITABLE_MODE: "stub", NEXT_PUBLIC_SITE_URL: "" },
      reuseExistingServer: !isCI,
      // CI has no separate build step, so the build log must be visible when
      // the server fails to start.
      stdout: isCI ? "pipe" : "ignore",
      timeout: 300_000,
    },
    // Live build into .next-live (next.config.ts reads NEXT_DIST_DIR).
    {
      command: `pnpm build && pnpm start --port ${livePort}`,
      url: liveBaseURL,
      env: {
        NEXT_PUBLIC_HOSPITABLE_MODE: "live",
        NEXT_PUBLIC_SITE_URL: "",
        NEXT_DIST_DIR: ".next-live",
      },
      reuseExistingServer: !isCI,
      stdout: isCI ? "pipe" : "ignore",
      timeout: 300_000,
    },
  ],
});
