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

  test("pick photos load at 3:2 and carry a credit line", async ({ page }) => {
    await page.goto("/area");
    const cards = page.getByTestId("area-picks").locator("article");
    const withPhoto = cards.filter({ has: page.locator("img") });
    await expect(withPhoto.first()).toBeVisible();
    for (const card of await withPhoto.all()) {
      const img = card.locator("img").first();
      await img.scrollIntoViewIfNeeded();
      // Loaded, not a broken image.
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
        .toBeGreaterThan(0);
      // The frame is 3:2 (within a pixel of rounding).
      const box = await img.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.abs(box!.width / box!.height - 1.5)).toBeLessThan(0.02);
      await expect(img).toHaveAttribute("alt", /\S/);
      const credit = card.getByTestId("photo-credit");
      await expect(credit).toContainText(/^Photo:/);
      await expect(credit.locator("a")).toHaveAttribute("href", /^https:\/\//);
    }
  });

  test("Closest to sorts the picks for the chosen house", async ({ page }) => {
    await page.goto("/area");
    const filter = page.getByTestId("area-filter");
    const any = filter.getByRole("button", { name: "Any house" });
    await expect(any).toHaveAttribute("aria-pressed", "true");
    const ids = () =>
      page
        .getByTestId("area-picks")
        .locator("article")
        .evaluateAll((els) => els.map((el) => el.id));
    const contentOrder = await ids();

    await filter.getByRole("button", { name: "An Oak Hill Home" }).click();
    await expect(page).toHaveURL(/\?house=oak-hill$/);
    await expect(
      filter.getByRole("button", { name: "An Oak Hill Home" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(any).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("area-filter-status")).toContainText(
      "Sorted by travel time from An Oak Hill Home, walkable places first.",
    );

    // Same picks, new order: walks first, then drives in rising order.
    const sorted = await ids();
    expect([...sorted].sort()).toEqual([...contentOrder].sort());
    expect(sorted).not.toEqual(contentOrder);
    const rows = page
      .getByTestId("area-picks")
      .locator('article [data-testid="drive-times"] [data-slug="oak-hill"]');
    const travel = await rows.evaluateAll((els) =>
      els.map((el) => ({
        walk: el.getAttribute("data-mode") === "walk",
        minutes: Number(el.querySelector("dd")?.textContent?.match(/\d+/)?.[0]),
      })),
    );
    const rank = (t: { walk: boolean; minutes: number }) =>
      (t.walk ? 0 : 1000) + t.minutes;
    travel.slice(1).forEach((t, i) => {
      expect(rank(t)).toBeGreaterThanOrEqual(rank(travel[i]!));
    });
    // Each card shows only the chosen house's row, highlighted.
    await expect(rows.first().locator("dt")).toHaveCSS("font-weight", "600");
    const cards = page.getByTestId("area-picks").locator("article");
    const visibleRows = cards
      .first()
      .locator('[data-testid="drive-times"] > [data-slug]:visible');
    await expect(visibleRows).toHaveCount(1);
    await expect(visibleRows).toHaveAttribute("data-slug", "oak-hill");

    // Grouped under closeness headings, closest group first.
    const headings = page.getByTestId("area-picks").getByRole("heading", {
      level: 2,
    });
    await expect(headings.first()).toHaveText(
      /^(A short walk|Under 10 minutes)/,
    );

    // A reload keeps the choice; Any house restores the content order.
    await page.reload();
    await expect(
      filter.getByRole("button", { name: "An Oak Hill Home" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(await ids()).toEqual(sorted);
    await any.click();
    await expect(page).toHaveURL(/\/area$/);
    expect(await ids()).toEqual(contentOrder);
    // With no house chosen, every house's row is back.
    await expect(
      cards
        .first()
        .locator('[data-testid="drive-times"] > [data-slug]:visible'),
    ).toHaveCount(HOUSES.length);
  });

  test("opens sorted for the house named in the link", async ({ page }) => {
    await page.goto("/area?house=south-austin");
    await expect(
      page
        .getByTestId("area-filter")
        .getByRole("button", { name: "South Austin Stay" }),
    ).toHaveAttribute("aria-pressed", "true");
    // The South Austin houses have picks within walking distance.
    await expect(
      page.getByTestId("area-picks").getByRole("heading", { level: 2 }).first(),
    ).toHaveText(/^A short walk$/);
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
