import { expect, test, type Page } from "@playwright/test";

const SLUGS = ["oak-hill", "south-austin", "fire-side"] as const;
const LICENSES = ["OL2026086598", "OL2026040319", "OL2026031718"];

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

  test("renders the three anchored sections with their headings", async ({
    page,
  }) => {
    await page.goto("/");
    for (const [id, heading] of [
      ["stays", "The stays"],
      ["area", "What's worth doing"],
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
    // Practicals moved to the property pages.
    await expect(page.locator("section#practicals")).toHaveCount(0);
    await expect(page.getByTestId("practicals")).toHaveCount(0);
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

  test("hero mounts the search stub and the area guide mounts both TikTok embeds", async ({
    page,
  }) => {
    // Keep TikTok off the network: the fallback must stay visible for the
    // assertions below, and the real player would hide it once it loads.
    await page.route(/tiktok(cdn-us)?\.com/, (route) => route.abort());
    await page.goto("/");

    await expect(page.getByText("Check dates across all three")).toBeVisible();
    const search = page.getByTestId("hospitable-search-stub");
    await expect(search).toContainText("Search all 3 houses");
    await expect(
      search.getByRole("link", { name: "See the houses" }),
    ).toHaveAttribute("href", "/#stays");

    const feature = page.getByTestId("video-feature");
    const clips = feature.getByTestId("video-clip");
    await expect(clips).toHaveCount(2);
    for (const [index, [handle, heading]] of (
      [
        ["exploretex", /Barton Springs/],
        ["gabynjohnny", /BBQ/],
      ] as const
    ).entries()) {
      const clip = clips.nth(index);
      const tiktok = clip.getByTestId("tiktok-embed");
      await expect(
        tiktok.getByRole("link", { name: "Watch on TikTok" }),
      ).toHaveAttribute(
        "href",
        new RegExp(`tiktok\\.com/@${handle}/video/\\d+`),
      );
      // The heading and text sit in the same column as the player.
      await expect(
        clip.getByRole("heading", { level: 3, name: heading }),
      ).toBeVisible();
      // embed.js is injected into the leaf container and scans for the blockquote it finds there
      // (blocked above, so the fallback stays and the blockquote is never swapped).
      await expect(tiktok.locator("blockquote.tiktok-embed")).toHaveCount(1);
      await expect(
        tiktok.locator('script[src="https://www.tiktok.com/embed.js"]'),
      ).toHaveCount(1);
    }

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
    await expect(toggle).toHaveAttribute("data-mode", "light");
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-mode", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await mapGroundFill(page)).toBe(MAP_GROUND_DARK);
  });

  test("hosts and the direct-booking section render from content", async ({
    page,
  }) => {
    await page.goto("/");

    const hosts = page.getByTestId("hosts-strip").locator("li");
    await expect(hosts).toHaveCount(3);
    await expect(hosts).toContainText(["Alexis", "Gabe", "Aaron"]);

    const direct = page.locator("section#direct");
    await expect(direct).toContainText("What direct booking changes");
    await expect(direct.locator("li")).toHaveCount(4);
    await expect(direct.getByTestId("contact-form-slot")).toBeVisible();
  });
});

// The shell (header, footer, skip link) is the same on every route; it is
// asserted once here, on the home page. The 404 shell is in stays.spec.ts.
test.describe("site shell", () => {
  test("header, nav, and footer render on the home page", async ({ page }) => {
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(
      header.getByRole("link", { name: "The Austin Collection" }),
    ).toHaveAttribute("href", "/");

    const nav = header.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link")).toHaveCount(3);
    for (const [label, href] of [
      ["Stays", "/#stays"],
      ["The area", "/#area"],
      ["Book direct", "/#direct"],
    ]) {
      await expect(nav.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href!,
      );
    }
    await expect(header.locator("[data-theme-toggle]")).toBeVisible();

    await expect(page.getByRole("main")).toHaveAttribute("id", "main");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText(
      "Phone shared with guests after booking",
    );
    // No public email or Instagram; the footer points at the contact form.
    await expect(
      footer.getByRole("link", { name: "Send us a message" }),
    ).toHaveAttribute("href", "/#direct");
    await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0);
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
});
