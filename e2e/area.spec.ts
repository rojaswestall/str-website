import { expect, test } from "@playwright/test";

const HOUSES = ["An Oak Hill Home", "South Austin Stay", "Fire Side Home"];

test.describe("area guide", () => {
  test("lists every pick with the drive time from each house", async ({
    page,
  }) => {
    await page.goto("/area");
    await expect(page).toHaveTitle(/Area guide/);
    await expect(
      page.getByRole("heading", { level: 1, name: "What's worth doing" }),
    ).toBeVisible();

    const picks = page.getByTestId("area-picks").locator("article");
    await expect(picks.first()).toBeVisible();
    const count = await picks.count();
    for (let index = 0; index < count; index++) {
      const pick = picks.nth(index);
      await expect(pick).toHaveAttribute("id", /^[a-z0-9-]+$/);
      const times = pick.getByTestId("drive-times");
      // One row per house, in content order.
      await expect(times.locator("dt")).toHaveText(HOUSES);
      // Each time is a confirmed number or the dashed t.b.c. gap.
      for (const dd of await times.locator("dd").all()) {
        await expect(dd).toHaveText(/^(\d+ min( drive| walk)?|t\.b\.c\.)$/);
      }
    }
  });

  test("shows a walk time instead of the drive for a house that is close", async ({
    page,
  }) => {
    await page.goto("/area");
    const walks = page.locator(
      '[data-testid="drive-times"] [data-mode="walk"]',
    );
    // At least one pick is listed as walkable from some house.
    await expect(walks.first()).toBeVisible();
    for (const row of await walks.all()) {
      await expect(row.locator("dd")).toHaveText(/^\d+ min walk$/);
    }
    // Drive rows never read as walks.
    for (const row of await page
      .locator('[data-testid="drive-times"] [data-mode="drive"] dd')
      .all()) {
      await expect(row).not.toHaveText(/walk/);
    }
  });

  test("is linked from the header nav and the home page", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "The area" })
      .click();
    await expect(page).toHaveURL(/\/area$/);
    await expect(page.getByTestId("area-picks")).toBeVisible();
  });
});
