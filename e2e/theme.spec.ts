import { expect, test, type Page } from "@playwright/test";

// Raw token values from app/globals.css, as the browser reports them.
const PAPER_LIGHT = "rgb(250, 249, 247)";
const PAPER_DARK = "rgb(22, 21, 19)";

const bodyBackground = (page: Page) =>
  page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);

// next-themes stores an explicit choice under this key; nothing is written
// while the visitor is on "system".
const storedTheme = (page: Page) =>
  page.evaluate(() => window.localStorage.getItem("theme"));

test.describe("theme", () => {
  test("follows the system preference on first visit", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await bodyBackground(page)).toBe(PAPER_DARK);
    await context.close();
  });

  test("defaults to light when the system prefers light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await bodyBackground(page)).toBe(PAPER_LIGHT);
  });

  test("a system preference change flips the theme live until a choice is stored", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");
    // First visit: the attribute comes from the media query alone.
    expect(await storedTheme(page)).toBeNull();

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html).toHaveAttribute("data-theme", "dark");
    expect(await bodyBackground(page)).toBe(PAPER_DARK);
    expect(await storedTheme(page)).toBeNull();

    // An explicit choice is stored and then wins over the system preference.
    const toggle = page.locator("[data-theme-toggle]");
    await toggle.click(); // system → light
    await expect(toggle).toHaveAttribute("data-mode", "light");
    await expect(html).toHaveAttribute("data-theme", "light");
    expect(await storedTheme(page)).toBe("light");
    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html).toHaveAttribute("data-theme", "light");
    expect(await bodyBackground(page)).toBe(PAPER_LIGHT);
  });

  test("toggle cycles light, dark, system and persists across reload", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const toggle = page.locator("[data-theme-toggle]");
    const html = page.locator("html");

    // Starts on system (resolves to light); label appears after mount.
    await expect(toggle).toHaveAttribute("data-mode", "system");
    await expect(toggle).toHaveAccessibleName(/switch to light/i);

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-mode", "light");
    await expect(html).toHaveAttribute("data-theme", "light");

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-mode", "dark");
    await expect(html).toHaveAttribute("data-theme", "dark");
    expect(await bodyBackground(page)).toBe(PAPER_DARK);

    // The explicit choice survives a reload and is applied before paint.
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(toggle).toHaveAttribute("data-mode", "dark");

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-mode", "system");
    await expect(html).toHaveAttribute("data-theme", "light");
  });

  test("display font utility resolves to Newsreader", async ({ page }) => {
    await page.goto("/");
    const family = await page
      .locator("h1")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toMatch(/Newsreader/);
  });
});
