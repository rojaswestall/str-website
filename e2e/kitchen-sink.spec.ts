import { expect, test } from "@playwright/test";

// The suite runs against the production build, where the dev gallery must not exist.
test("kitchen sink is a 404 in production", async ({ page }) => {
  const response = await page.goto("/kitchen-sink");
  expect(response?.status()).toBe(404);
});
