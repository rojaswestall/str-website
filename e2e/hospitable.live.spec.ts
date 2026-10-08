import { expect, test, type Page } from "@playwright/test";

/*
 * Runs in the "chromium-live" project only, against the second build made
 * with NEXT_PUBLIC_HOSPITABLE_MODE=live. The real loader is never fetched: the
 * route below answers for cdn.hsptb.com with a tiny stand-in that behaves like
 * the real one (reads its own data-* attributes, inserts its output right
 * after the script element).
 *
 * Fire Side Home is the only house with a Hospitable property id in content
 * (docs/plan.md, open items), so it is the live mount; the other two exercise
 * the stub fallback.
 */
const FAKE_LOADER = `
  (() => {
    const script = document.currentScript;
    const marker = document.createElement("div");
    marker.dataset.testid = "hospitable-live-marker";
    marker.dataset.siteUuid = script.dataset.siteUuid;
    marker.dataset.propertyId = script.dataset.propertyId;
    marker.dataset.theme = script.dataset.theme;
    marker.textContent = "fake hospitable widget";
    script.insertAdjacentElement("afterend", marker);
  })();
`;

async function interceptLoader(page: Page) {
  const loads: string[] = [];
  await page.route("**/cdn.hsptb.com/**", async (route) => {
    loads.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: FAKE_LOADER,
    });
  });
  return loads;
}

const SITE_UUID = "a2dd8e69-2e7b-4a23-a07e-718ab1e46afb";
const FIRE_SIDE_PROPERTY_ID = "2338068";

test.describe("hospitable widgets (live mode)", () => {
  test("mounts the loader once and re-mounts after client-side navigation away and back", async ({
    page,
  }) => {
    const loads = await interceptLoader(page);
    await page.goto("/stays/fire-side");

    const marker = page.getByTestId("hospitable-live-marker");
    await expect(marker).toHaveCount(1);
    await expect(marker).toHaveAttribute("data-site-uuid", SITE_UUID);
    await expect(marker).toHaveAttribute(
      "data-property-id",
      FIRE_SIDE_PROPERTY_ID,
    );
    await expect(marker).toHaveAttribute("data-theme", "multi");
    await expect(page.getByTestId("hospitable-stub")).toHaveCount(0);

    const script = page.locator(
      'script[src="https://cdn.hsptb.com/direct-booking-widget/widget-loader.prod.js"]',
    );
    await expect(script).toHaveCount(1);
    await expect(script).toHaveAttribute("data-site-uuid", SITE_UUID);
    await expect(script).toHaveAttribute(
      "data-property-id",
      FIRE_SIDE_PROPERTY_ID,
    );
    await expect(script).toHaveAttribute("data-theme", "multi");
    // The loader's output lands inside the container React hands over to it.
    await expect(
      page
        .getByTestId("hospitable-widget")
        .locator("[data-hospitable-container] > *"),
    ).toHaveCount(2);

    // Client-side navigation to a house without an id: the live mount is torn
    // down and the stub takes its place.
    const others = page.getByRole("navigation", { name: "Other houses" });
    await others.getByRole("link", { name: "An Oak Hill Home" }).click();
    await expect(page).toHaveURL(/\/stays\/oak-hill$/);
    await expect(page.getByTestId("hospitable-stub")).toContainText(
      "An Oak Hill Home",
    );
    await expect(marker).toHaveCount(0);
    await expect(script).toHaveCount(0);

    // Back to the live house: exactly one fresh marker and one fresh script.
    await others.getByRole("link", { name: "Fire Side Home" }).click();
    await expect(page).toHaveURL(/\/stays\/fire-side$/);
    await expect(marker).toHaveCount(1);
    await expect(marker).toHaveAttribute(
      "data-property-id",
      FIRE_SIDE_PROPERTY_ID,
    );
    await expect(script).toHaveCount(1);
    expect(loads).toHaveLength(2);
  });

  test("falls back to the stub and warns once when the house has no property id", async ({
    page,
  }) => {
    const loads = await interceptLoader(page);
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning") warnings.push(message.text());
    });

    await page.goto("/stays/oak-hill");

    await expect(page.getByTestId("hospitable-stub")).toBeVisible();
    await expect(page.getByTestId("hospitable-stub")).toContainText(
      "An Oak Hill Home",
    );
    await expect(page.getByTestId("hospitable-live-marker")).toHaveCount(0);
    expect(loads).toEqual([]);
    expect(
      warnings.filter((text) => text.includes("[Hospitable] live mode")),
    ).toHaveLength(1);
  });

  test("the home search widget stays a stub until its snippet exists", async ({
    page,
  }) => {
    const loads = await interceptLoader(page);
    await page.goto("/");
    await expect(page.getByTestId("hospitable-search-stub")).toBeVisible();
    expect(loads).toEqual([]);
  });
});
