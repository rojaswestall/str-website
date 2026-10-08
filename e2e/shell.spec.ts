import { expect, test } from "@playwright/test";

const LICENSES = ["OL2026086598", "OL2026040319", "OL2026031718"];

test.describe("site shell", () => {
  test("header, nav, and footer render on the home page", async ({ page }) => {
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(
      header.getByRole("link", { name: "The Austin Collection" }),
    ).toHaveAttribute("href", "/");

    const nav = header.getByRole("navigation", { name: "Primary" });
    for (const [label, href] of [
      ["Stays", "/#stays"],
      ["The area", "/#area"],
      ["Practicals", "/#practicals"],
      ["Book direct", "/#direct"],
    ]) {
      await expect(nav.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href!,
      );
    }
    await expect(header.locator("[data-theme-toggle]")).toBeVisible();

    await expect(page.getByRole("main")).toHaveAttribute("id", "main");
    await expect(page.getByRole("contentinfo")).toContainText(
      "Phone shared with guests after booking",
    );
  });

  test("footer lists the three STR licenses", async ({ page }) => {
    await page.goto("/");
    const licenses = page.getByTestId("str-licenses");
    await expect(licenses).toContainText("City of Austin STR licenses");
    for (const number of LICENSES) {
      await expect(licenses).toContainText(number);
    }
  });

  test("skip link is the first tab stop and targets main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute("href", "#main");
  });

  test("unknown routes render the branded 404 with status 404", async ({
    page,
  }) => {
    const response = await page.goto("/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Page not found · The Austin Collection");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /isn.t one of ours/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Back to the houses" }),
    ).toHaveAttribute("href", "/");
  });
});
