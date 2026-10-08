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

  test("every page carries the report-only CSP header", async ({ page }) => {
    for (const path of ["/", "/stays/oak-hill", "/does-not-exist"]) {
      const response = await page.goto(path);
      const csp = response?.headers()["content-security-policy-report-only"];
      expect(csp, path).toBeTruthy();
      expect(csp).toContain(
        "script-src 'self' 'unsafe-inline' https://cdn.hsptb.com",
      );
      expect(csp).toContain("frame-src https://booking.hospitable.com");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(response?.headers()["content-security-policy"]).toBeUndefined();
    }
  });
});
