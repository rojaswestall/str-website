import { defineConfig, devices } from "@playwright/test";

/*
 * Three Chromium projects, each against its own production build. The dev
 * server is never used: with Cache Components the two behave differently
 * (see the 404 status note in docs/architecture.md).
 *
 * `chromium` (port 3000, default build, NEXT_PUBLIC_HOSPITABLE_MODE=stub)
 * runs every spec except `*.live.spec.ts` and `*.native.spec.ts`:
 *   home.spec.ts          the landing page, its sections, and the site shell
 *   stays.spec.ts         the three house pages, the stub per house, both 404s
 *   area.spec.ts          /area: every pick with its drive time from each house
 *   theme.spec.ts         system preference, toggle, persistence, fonts
 *   contact-api.spec.ts   POST /api/contact through the `request` fixture
 *   contact-form.spec.ts  the form in the browser against the real route
 *   hospitable.spec.ts    stub mode makes no loader request; the CSP header
 *   seo.spec.ts           sitemap, robots, OG images, JSON-LD, canonical tags
 *   kitchen-sink.spec.ts  /kitchen-sink is a 404 in production
 *   a11y.spec.ts          axe on /, one stay, /area, /search, and the 404 in
 *                         both themes
 *   visual.spec.ts        full-page screenshots of /, one stay, and /search
 *                         into e2e/__screenshots__/
 *                         (gitignored; CI uploads them as an artifact)
 *
 * `chromium-live` (port 3001, a second build with
 * NEXT_PUBLIC_HOSPITABLE_MODE=live into .next-live) runs only
 * hospitable.live.spec.ts: the one place the real loader shape is covered
 * (script attributes, remount on client-side navigation, no missing-id
 * warnings, the search bar and /search). The real loaders are intercepted,
 * never fetched.
 *
 * `chromium-native` (port 3002, a third build with
 * NEXT_PUBLIC_HOSPITABLE_MODE=native into .next-native) runs only
 * booking.native.spec.ts: the site's own booking widget and the /api/*
 * routes behind it, end to end. The build is pointed at the stand-in
 * Hospitable API in e2e/mock-hospitable/server.mjs (port 3999) with a
 * throwaway token, so nothing reaches Hospitable and no secret is needed.
 */

const port = 3000;
const livePort = 3001;
const nativePort = 3002;
const mockHospitablePort = 3999;
const baseURL = `http://localhost:${port}`;
const liveBaseURL = `http://localhost:${livePort}`;
const nativeBaseURL = `http://localhost:${nativePort}`;
const mockHospitableURL = `http://127.0.0.1:${mockHospitablePort}`;
const isCI = !!process.env.CI;

/** Shared with booking.native.spec.ts through process.env at config time. */
export const E2E_HOSPITABLE_TOKEN = "e2e-hospitable-token";
export const E2E_ADMIN_TOKEN = "e2e-admin-token-0123456789";
export const E2E_SITE_UUID = "a2dd8e69-2e7b-4a23-a07e-718ab1e46afb";

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
      testIgnore: /\.(live|native)\.spec\.ts$/,
    },
    {
      name: "chromium-live",
      use: { ...devices["Desktop Chrome"], baseURL: liveBaseURL },
      testMatch: /\.live\.spec\.ts$/,
    },
    {
      name: "chromium-native",
      use: { ...devices["Desktop Chrome"], baseURL: nativeBaseURL },
      testMatch: /\.native\.spec\.ts$/,
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
      env: {
        NEXT_PUBLIC_HOSPITABLE_MODE: "stub",
        NEXT_PUBLIC_SITE_URL: "",
        NEXT_PUBLIC_MAPKIT_TOKEN: "",
      },
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
        NEXT_PUBLIC_MAPKIT_TOKEN: "e2e-mapkit-token",
        NEXT_DIST_DIR: ".next-live",
      },
      reuseExistingServer: !isCI,
      stdout: isCI ? "pipe" : "ignore",
      timeout: 300_000,
    },
    // The stand-in Hospitable API the native build talks to.
    {
      command: "node e2e/mock-hospitable/server.mjs",
      url: `${mockHospitableURL}/health`,
      env: {
        MOCK_HOSPITABLE_PORT: String(mockHospitablePort),
        MOCK_HOSPITABLE_TOKEN: E2E_HOSPITABLE_TOKEN,
      },
      reuseExistingServer: !isCI,
      stdout: "ignore",
      timeout: 30_000,
    },
    // Native build into .next-native. Every booking variable is pinned here
    // so a developer's .env.local (with a real token) can never be used by
    // the suite: the routes only ever talk to the stand-in above.
    {
      command: `pnpm build && pnpm start --port ${nativePort}`,
      url: nativeBaseURL,
      env: {
        NEXT_PUBLIC_HOSPITABLE_MODE: "native",
        NEXT_PUBLIC_SITE_URL: "",
        NEXT_PUBLIC_MAPKIT_TOKEN: "",
        NEXT_DIST_DIR: ".next-native",
        HOSPITABLE_API_BASE_URL: `${mockHospitableURL}/v2`,
        HOSPITABLE_PERSONAL_ACCESS_TOKEN: E2E_HOSPITABLE_TOKEN,
        HOSPITABLE_PAT: "",
        HOSPITABLE_CUSTOM_SITE_ID: E2E_SITE_UUID,
        AIRBNB_LISTING_URLS: "",
        COMPARISON_ENABLED: "true",
        MAX_NIGHTS: "90",
        BOOKING_ADMIN_TOKEN: E2E_ADMIN_TOKEN,
      },
      reuseExistingServer: !isCI,
      stdout: isCI ? "pipe" : "ignore",
      timeout: 300_000,
    },
  ],
});
