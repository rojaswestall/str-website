import { expect, test } from "@playwright/test";

const AIRBNB_OAK_HILL = "https://www.airbnb.com/rooms/1598934202273477463";

// This project runs against the default build, where the widgets are stubs.
test.describe("hospitable widgets (stub mode)", () => {
  test("a house renders the booking stub and never loads the loader", async ({
    page,
  }) => {
    const loaderRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("hsptb.com"))
        loaderRequests.push(request.url());
    });

    await page.goto("/stays/oak-hill");

    const stub = page.getByTestId("hospitable-stub");
    await expect(stub).toBeVisible();
    await expect(stub).toContainText("An Oak Hill Home");
    await expect(stub.getByLabel("Check-in")).toBeDisabled();
    await expect(stub.getByLabel("Checkout")).toBeDisabled();
    await expect(stub.getByLabel("Guests")).toBeDisabled();

    const airbnb = stub.getByRole("link", {
      name: "Check availability on Airbnb",
    });
    await expect(airbnb).toHaveAttribute("href", AIRBNB_OAK_HILL);
    await expect(airbnb).toHaveAttribute("target", "_blank");
    await expect(airbnb).toHaveAttribute("rel", /noopener/);

    await expect(page.getByTestId("hospitable-widget")).toHaveCount(0);
    expect(loaderRequests).toEqual([]);
  });

  test("/search renders the search stub and never loads the search script", async ({
    page,
  }) => {
    const searchRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("hospitable.b-cdn.net"))
        searchRequests.push(request.url());
    });

    const response = await page.goto("/search");
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1, name: "Which house is free?" }),
    ).toBeVisible();
    const stub = page.getByTestId("hospitable-search-stub");
    await expect(stub).toBeVisible();
    await expect(stub).toHaveAttribute("data-variant", "results");
    await expect(stub).toContainText("Search all 3 houses");
    await expect(page.locator("hospitable-direct-mps")).toHaveCount(0);

    // Client-rendered results: kept out of the index, links still followed.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /follow/,
    );

    const houses = page.getByRole("navigation", { name: "The houses" });
    for (const [name, slug] of [
      ["An Oak Hill Home", "oak-hill"],
      ["South Austin Stay", "south-austin"],
      ["Fire Side Home", "fire-side"],
    ]) {
      await expect(houses.getByRole("link", { name })).toHaveAttribute(
        "href",
        `/stays/${slug}`,
      );
    }
    expect(searchRequests).toEqual([]);
  });

  test("every page carries the report-only CSP header", async ({ page }) => {
    for (const path of ["/", "/stays/oak-hill", "/search", "/does-not-exist"]) {
      const response = await page.goto(path);
      const csp = response?.headers()["content-security-policy-report-only"];
      expect(csp, path).toBeTruthy();
      expect(csp).toContain(
        "script-src 'self' 'unsafe-inline' https://cdn.hsptb.com https://hospitable.b-cdn.net",
      );
      expect(csp).toContain("frame-src https://booking.hospitable.com");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(response?.headers()["content-security-policy"]).toBeUndefined();
    }
  });
});
