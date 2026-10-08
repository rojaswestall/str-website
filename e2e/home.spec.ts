import { expect, test, type Page } from "@playwright/test";

const SLUGS = ["oak-hill", "south-austin", "fire-side"] as const;

// Raw --map-ground values from app/globals.css, as the browser reports them.
const MAP_GROUND_LIGHT = "rgb(241, 239, 234)";
const MAP_GROUND_DARK = "rgb(30, 28, 25)";

const mapGroundFill = (page: Page) =>
  page.locator("[data-map-ground]").evaluate((el) => getComputedStyle(el).fill);

test.describe("home page", () => {
  test("loads with the site title and the hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/The Austin Collection/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Places we look after, properly.",
    );
    await expect(page.getByText("Three houses · one small team")).toBeVisible();
    // The lede names every host.
    const lede = page.locator("#hero-heading + p");
    for (const host of ["Alexis", "Gabe", "Aaron"]) {
      await expect(lede).toContainText(host);
    }
  });

  test("renders the four anchored sections with their headings", async ({
    page,
  }) => {
    await page.goto("/");
    for (const [id, heading] of [
      ["stays", "The stays"],
      ["area", "What's worth doing"],
      ["practicals", "Practicals"],
      ["direct", "Why book direct"],
    ] as const) {
      const section = page.locator(`section#${id}`);
      await expect(section, id).toHaveCount(1);
      await expect(
        section.getByRole("heading", { level: 2, name: heading }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole("heading", { level: 2, name: "Your hosts" }),
    ).toBeVisible();
  });

  test("three property bands link to the right slugs", async ({ page }) => {
    await page.goto("/");
    const bands = page.getByTestId("property-band");
    await expect(bands).toHaveCount(3);

    for (const [index, slug] of SLUGS.entries()) {
      const band = bands.nth(index);
      await expect(band).toHaveAttribute("data-slug", slug);
      await expect(
        band.getByRole("link", { name: "Book direct" }),
      ).toHaveAttribute("href", `/stays/${slug}#book`);
      await expect(
        band.getByRole("link", { name: "See the whole house" }),
      ).toHaveAttribute("href", `/stays/${slug}`);
      await expect(band.getByRole("heading", { level: 3 })).toBeVisible();
    }

    // Rates and minimum nights are still unconfirmed: shown as gaps, never numbers.
    await expect(bands.first()).toContainText("min nights t.b.c.");
    await expect(bands.first()).toContainText("rate t.b.c.");
    await expect(bands.first()).not.toContainText("$");
  });

  test("hero mounts the search stub and the area guide mounts the TikTok embed", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText("Check dates across all three")).toBeVisible();
    const search = page.getByTestId("hospitable-search-stub");
    await expect(search).toContainText("Search all 3 houses");
    await expect(
      search.getByRole("link", { name: "See the houses" }),
    ).toHaveAttribute("href", "/#stays");

    const feature = page.getByTestId("video-feature");
    await expect(
      feature.getByRole("heading", { level: 3, name: /Barton Springs/ }),
    ).toBeVisible();
    const tiktok = feature.getByTestId("tiktok-embed");
    await expect(
      tiktok.getByRole("link", { name: "Watch on TikTok" }),
    ).toHaveAttribute("href", /tiktok\.com\/@exploretex\/video\/\d+/);
    // embed.js is injected into the leaf container and scans for the blockquote it finds there.
    await expect(tiktok.locator("blockquote.tiktok-embed")).toHaveCount(1);
    await expect(
      tiktok.locator('script[src="https://www.tiktok.com/embed.js"]'),
    ).toHaveCount(1);

    await expect(page.getByTestId("area-picks").locator("article")).toHaveCount(
      3,
    );
  });

  test("city map draws one pin per house and recolours with the theme", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    const map = page.getByTestId("city-map");
    await expect(
      map.getByRole("img", { name: /Where the houses are/ }),
    ).toBeVisible();
    await expect(map.locator("[data-map-pin]")).toHaveCount(3);
    for (const slug of SLUGS) {
      await expect(map.locator(`[data-map-pin="${slug}"]`)).toHaveCount(1);
    }
    await expect(map).toContainText("Oak Hill · one house");
    await expect(map).toContainText("South Austin · two houses");

    expect(await mapGroundFill(page)).toBe(MAP_GROUND_LIGHT);

    // system → light → dark
    const toggle = page.locator("[data-theme-toggle]");
    await expect(toggle).toHaveAttribute("data-mode", "system");
    await toggle.click();
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await mapGroundFill(page)).toBe(MAP_GROUND_DARK);
  });

  test("hosts, practicals, and the direct-booking section render from content", async ({
    page,
  }) => {
    await page.goto("/");

    const hosts = page.getByTestId("hosts-strip").locator("li");
    await expect(hosts).toHaveCount(3);
    await expect(hosts).toContainText(["Alexis", "Gabe", "Aaron"]);

    const practicals = page.getByTestId("practicals");
    for (const term of [
      "Check-in",
      "Check-out",
      "Cleaning",
      "Pets",
      "Cancellation",
      "Questions",
    ]) {
      await expect(
        practicals.locator("dt", { hasText: new RegExp(`^${term}$`) }),
      ).toHaveCount(1);
    }
    const faq = page.getByTestId("practicals-faq");
    await expect(
      faq.getByRole("heading", { level: 3, name: "Booking direct" }),
    ).toBeVisible();
    await expect(faq.locator("dt")).toHaveCount(3);
    await expect(faq).toContainText(
      "How does payment work when I book direct?",
    );

    const direct = page.locator("section#direct");
    await expect(direct).toContainText("What direct booking changes");
    await expect(direct.locator("li")).toHaveCount(4);
    await expect(direct.getByTestId("contact-form-slot")).toBeVisible();
  });
});
