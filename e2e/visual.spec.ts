import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/*
 * Full-page screenshots of the home page and one stay in both themes at
 * 1400px, written to e2e/__screenshots__/<route>-<theme>.png as review aids.
 * This is `page.screenshot`, not `toHaveScreenshot`: there is no pixel
 * comparison yet because font rasterisation differs across operating systems.
 * The files are regenerated on every run.
 */

const DIR = path.join(__dirname, "__screenshots__");

const ROUTES = [
  { name: "home", path: "/" },
  { name: "stays-oak-hill", path: "/stays/oak-hill" },
] as const;

const THEMES = ["light", "dark"] as const;

test.use({ viewport: { width: 1400, height: 900 } });

/*
 * Scroll through the page so lazy images load, then wait for them and the
 * fonts. The image wait is capped: a still-loading image only costs the
 * review aid a blank frame, which beats a 30s timeout on a slow runner.
 */
const IMAGE_WAIT_MS = 5_000;

async function settle(page: Page) {
  await page.evaluate(async (timeoutMs) => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
    const pending = Array.from(document.images)
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          }),
      );
    await Promise.race([
      Promise.all(pending),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }, IMAGE_WAIT_MS);
}

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`captures ${route.path} in ${theme}`, async ({ page }) => {
      // The TikTok player is third-party and themeless; keep the styled fallback.
      await page.route(/tiktok(cdn-us)?\.com/, (route) => route.abort());
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(route.path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("[data-theme-toggle]")).toHaveAttribute(
        "data-mode",
        "system",
      );
      await settle(page);

      mkdirSync(DIR, { recursive: true });
      await page.screenshot({
        path: path.join(DIR, `${route.name}-${theme}.png`),
        fullPage: true,
        animations: "disabled",
      });
    });
  }
}
