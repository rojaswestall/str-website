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

    // Bands are brief: rooms only. Rate, minimum nights, and amenities are on
    // the house page.
    await expect(bands.first()).toContainText("Sleeps 8");
    await expect(bands.first()).not.toContainText("min nights");
    await expect(bands.first()).not.toContainText("rate");
    await expect(bands.first()).not.toContainText("$");
    await expect(page.getByRole("list", { name: "Amenities" })).toHaveCount(0);
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

    // The picks themselves live on /area (e2e/area.spec.ts); home links there.
    await expect(page.getByTestId("area-picks")).toHaveCount(0);
    await expect(
      page
        .locator("section#area")
        .getByRole("link", { name: "Open the area guide" }),
    ).toHaveAttribute("href", "/area");
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

  test("guest reviews sit above the hosts with each house's record", async ({
    page,
  }) => {
    await page.goto("/");
    const reviews = page.locator("section#reviews");
    await expect(
      reviews.getByRole("heading", { level: 2, name: "What guests say" }),
    ).toBeVisible();
    // Average weighted by review count across the three listings.
    await expect(reviews).toContainText("4.99 average · 75 reviews");

    const records = reviews.getByTestId("review-records").locator("li");
    await expect(records).toHaveCount(3);
    for (const [index, [slug, name, airbnb]] of (
      [
        ["oak-hill", "An Oak Hill Home", /rooms\/1598934202273477463/],
        ["south-austin", "South Austin Stay", /rooms\/1655329029936239948/],
        ["fire-side", "Fire Side Home", /rooms\/1598953749522814358/],
      ] as const
    ).entries()) {
      const record = records.nth(index);
      await expect(
        record.getByRole("link", { name, exact: true }),
      ).toHaveAttribute("href", `/stays/${slug}`);
      await expect(
        record.getByRole("link", { name: /Read the reviews on Airbnb/ }),
      ).toHaveAttribute("href", airbnb);
    }
    // Two quotes per house, interleaved, each naming its house.
    const quotes = reviews.getByTestId("review-quotes").locator("figcaption");
    await expect(quotes).toHaveCount(6);
    await expect(quotes.first()).toContainText("Melanie");
    await expect(quotes).toContainText([
      "An Oak Hill Home",
      "South Austin Stay",
      "Fire Side Home",
      "An Oak Hill Home",
      "South Austin Stay",
      "Fire Side Home",
    ]);
    await expect(reviews.getByTestId("review-quotes-tbc")).toHaveCount(0);

    // The quotes are a slideshow: one review in the middle, chevrons step
    // either way (wrapping), a faded neighbour can be clicked to the middle,
    // and the timer bar finishing moves on to the next review.
    const slides = reviews.getByTestId("review-quotes").locator("li");
    const current = slides.locator("xpath=self::*[@data-current]");
    await expect(current).toHaveCount(1);
    await expect(current).toContainText("Melanie");
    await expect(reviews.getByTestId("review-counter")).toHaveText("01 / 06");
    await reviews.getByRole("button", { name: "Next review" }).click();
    await expect(current).toContainText("Adrián");
    await reviews.getByRole("button", { name: "Previous review" }).click();
    await reviews.getByRole("button", { name: "Previous review" }).click();
    await expect(current).toContainText("Fire Side Home");
    await expect(reviews.getByTestId("review-counter")).toHaveText("06 / 06");
    await slides.nth(0).click();
    await expect(current).toContainText("Melanie");
    await reviews.getByTestId("review-timer").dispatchEvent("animationend");
    await expect(current).toContainText("Adrián");
    const pause = reviews.getByRole("button", { name: "Pause slideshow" });
    await pause.click();
    await expect(
      reviews.getByRole("button", { name: "Play slideshow" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Order on the page: Why book direct, then reviews, then hosts.
    const ids = await page
      .locator("main section[id], main section[aria-labelledby=hosts-heading]")
      .evaluateAll((sections) =>
        sections.map((s) => s.id || s.getAttribute("aria-labelledby")),
      );
    expect(ids.slice(-3)).toEqual(["direct", "reviews", "hosts-heading"]);
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
      ["The area", "/area"],
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
