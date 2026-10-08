import { defineConfig, devices } from "@playwright/test";

const port = 3000;
const livePort = 3001;
const baseURL = `http://localhost:${port}`;
const liveBaseURL = `http://localhost:${livePort}`;

// Env shared by both production builds: keeps the widget lab routes available.
const devRoutes = { NEXT_PUBLIC_DEV_ROUTES: "1" };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // CI also writes playwright-report/, which ci.yml uploads on failure.
  reporter: process.env.CI
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
    // Default build: stub-mode widgets (NEXT_PUBLIC_HOSPITABLE_MODE unset).
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /\.live\.spec\.ts$/,
    },
    // Second build with NEXT_PUBLIC_HOSPITABLE_MODE=live, for *.live.spec.ts only.
    {
      name: "chromium-live",
      use: { ...devices["Desktop Chrome"], baseURL: liveBaseURL },
      testMatch: /\.live\.spec\.ts$/,
    },
  ],
  // Always test production builds, never the dev server.
  webServer: [
    {
      command: `pnpm build && pnpm start --port ${port}`,
      url: baseURL,
      env: devRoutes,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
    {
      command: `pnpm build && pnpm start --port ${livePort}`,
      url: liveBaseURL,
      env: {
        ...devRoutes,
        NEXT_PUBLIC_HOSPITABLE_MODE: "live",
        NEXT_DIST_DIR: ".next-live",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
  ],
});
