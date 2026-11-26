import { expect, test, type Locator, type Page } from "@playwright/test";

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
    await expect(page.getByText("Three homes · one small team")).toBeVisible();
    await expect(
      page.getByText("Three homes in Austin, looked after by the three of us"),
    ).toBeVisible();
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
        band.getByRole("link", { name: "See the whole home" }),
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

  test("band photo and name tap through to the house on small screens only", async ({
    page,
  }) => {
    const slug = SLUGS[0];

    // Desktop with a mouse: the photo and name stay inert; the buttons lead on.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const band = page.getByTestId("property-band").first();
    for (const id of ["property-band-photo-link", "property-band-title-link"]) {
      await expect(band.getByTestId(id)).toHaveCSS("pointer-events", "none");
    }

    // Stacked layout below 760px: both are tap targets for the house page.
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of ["property-band-photo-link", "property-band-title-link"]) {
      const link = band.getByTestId(id);
      await expect(link).toHaveCSS("pointer-events", "auto");
      await expect(link).toHaveAttribute("href", `/stays/${slug}`);
      await expect(link).toHaveAttribute("tabindex", "-1");
    }
    await band.getByTestId("property-band-photo-link").click();
    await expect(page).toHaveURL(new RegExp(`/stays/${slug}$`));
  });

  test("hero mounts the search stub and the area guide shows both TikTok posters", async ({
    page,
  }) => {
    // Click to play: opening the page must not ask TikTok for anything.
    const tiktokRequests: string[] = [];
    page.on("request", (request) => {
      if (/tiktok(cdn-us)?\.com/.test(request.url())) {
        tiktokRequests.push(request.url());
      }
    });
    await page.route(/tiktok(cdn-us)?\.com/, (route) => route.abort());
    await page.goto("/");

    await expect(page.getByText("Check dates across all three")).toBeVisible();
    const search = page.getByTestId("hospitable-search-stub");
    await expect(search).toContainText("Search all 3 homes");
    await expect(
      search.getByRole("link", { name: "See the homes" }),
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
      await expect(tiktok).toHaveAttribute("data-state", "idle");
      // The play control is a real link to the clip, for no-JS and new tabs.
      await expect(
        tiktok.getByRole("link", { name: `Play the TikTok from @${handle}` }),
      ).toHaveAttribute(
        "href",
        new RegExp(`tiktok\\.com/@${handle}/video/\\d+`),
      );
      // The poster is an area pick's licensed photo, credited.
      const poster = tiktok.getByTestId("tiktok-poster").locator("img");
      await poster.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          poster.evaluate((img: HTMLImageElement) => img.naturalWidth),
        )
        .toBeGreaterThan(0);
      await expect(tiktok.getByTestId("photo-credit")).toContainText("Photo:");
      await expect(tiktok.locator("iframe")).toHaveCount(0);
      await expect(
        clip.getByRole("heading", { level: 3, name: heading }),
      ).toBeVisible();
    }
    expect(tiktokRequests).toEqual([]);

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
      map.getByRole("img", { name: /Where the homes are/ }),
    ).toBeVisible();
    await expect(map.locator("[data-map-pin]")).toHaveCount(3);
    for (const slug of SLUGS) {
      await expect(map.locator(`[data-map-pin="${slug}"]`)).toHaveCount(1);
    }
    await expect(map).toContainText("Oak Hill · one home");
    await expect(map).toContainText("South Austin · two homes");

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

  test("guest reviews sit above the area guide and hosts with each house's record", async ({
    page,
  }) => {
    await page.goto("/");
    const reviews = page.locator("section#reviews");
    await expect(
      reviews.getByRole("heading", { level: 2, name: "What guests say" }),
    ).toBeVisible();
    // Average weighted by review count across the three listings.
    await expect(reviews).toContainText("4.99 average · 90 reviews");

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

    // Order on the page: the hero's collage, Why book direct, the search and
    // map, the stays, reviews, the area guide, hosts.
    const ids = await page
      .locator("main > section")
      .evaluateAll((sections) =>
        sections.map((s) => s.id || s.getAttribute("aria-labelledby")),
      );
    expect(ids).toEqual([
      "hero-heading",
      "direct",
      "search",
      "stays",
      "reviews",
      "area",
      "hosts-heading",
    ]);
  });

  test("the review slideshow starts paused under reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const reviews = page.locator("section#reviews");
    // Paused from the start: the button offers Play, and the timer bar is
    // not running, so the first review stays put.
    await expect(
      reviews.getByRole("button", { name: "Play slideshow" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(reviews.getByTestId("review-timer")).toHaveClass(/scale-x-0/);
    await expect(reviews.getByTestId("review-counter")).toHaveText("01 / 06");
    // The arrows still work, and Play starts it.
    await reviews.getByRole("button", { name: "Next review" }).click();
    await expect(reviews.getByTestId("review-counter")).toHaveText("02 / 06");
    await reviews.getByRole("button", { name: "Play slideshow" }).click();
    await expect(
      reviews.getByRole("button", { name: "Pause slideshow" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("hosts and the direct-booking section render from content", async ({
    page,
  }) => {
    await page.goto("/");

    const hosts = page.getByTestId("hosts-strip").locator("li");
    await expect(hosts).toHaveCount(3);
    await expect(hosts).toContainText(["Alexis", "Gabe", "Aaron"]);
    // Each host has a photo and a confirmed line (no [TBC] gaps left).
    for (const name of ["Alexis", "Gabe", "Aaron"]) {
      await expect(
        page.getByTestId("hosts-strip").getByRole("img", { name }),
      ).toBeVisible();
    }
    await expect(page.getByTestId("hosts-strip")).not.toContainText("[TBC]");

    const direct = page.locator("section#direct");
    await expect(direct).toContainText("What direct booking changes");
    await expect(direct.locator("li")).toHaveCount(4);
    // The contact form moved to the Contact us pop-up.
    await expect(direct.getByRole("form")).toHaveCount(0);
  });
});

// The shell (header, footer, skip link) is the same on every route; it is
// asserted once here, on the home page. The 404 shell is in stays.spec.ts.
test.describe("site shell", () => {
  test("the nav marks the area guide as the current page only on /area", async ({
    page,
  }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await page.goto("/area");
    await expect(nav.getByRole("link", { name: "The area" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.locator("[aria-current]")).toHaveCount(1);
    await page.goto("/");
    await expect(nav.locator("[aria-current]")).toHaveCount(0);
  });

  test("header items share one centre line, and fit two rows on a phone", async ({
    page,
  }) => {
    const centre = async (locator: Locator) => {
      const box = await locator.boundingBox();
      return box!.y + box!.height / 2;
    };
    const header = page.getByRole("banner");
    const name = header.getByRole("link", { name: "The Austin Collection" });
    const stays = header.getByRole("link", { name: "Stays" });
    const contact = header.getByRole("button", { name: "Contact us" });
    const toggle = header.locator("[data-theme-toggle]");

    // Desktop: name, nav, Contact us, and the toggle on one centre line.
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const line = await centre(name);
    for (const item of [stays, contact, toggle]) {
      expect(Math.abs((await centre(item)) - line)).toBeLessThan(2);
    }

    // Every header control is at least WCAG 2.2's 24px minimum target.
    for (const item of await header.locator("a, button").all()) {
      expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(24);
    }

    // A 360px phone: the name and both buttons on the top row, the nav below.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.evaluate(() => document.fonts.ready);
    const top = await centre(name);
    expect(Math.abs((await centre(contact)) - top)).toBeLessThan(2);
    expect(Math.abs((await centre(toggle)) - top)).toBeLessThan(2);
    expect(await centre(stays)).toBeGreaterThan(top + 20);
  });

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
    await expect(
      header.getByRole("button", { name: "Contact us" }),
    ).toHaveAttribute("aria-haspopup", "dialog");

    await expect(page.getByRole("main")).toHaveAttribute("id", "main");
    const footer = page.getByRole("contentinfo");
    await expect(footer).not.toContainText("Phone shared with guests");
    // The colophon links to the public production domain.
    await expect(
      footer.getByRole("link", { name: "www.theaustincollection.com" }),
    ).toHaveAttribute("href", "https://www.theaustincollection.com/");
    await expect(footer).not.toContainText("domain to confirm");
    // No public email or Instagram; the footer opens the contact form.
    await expect(
      footer.getByRole("button", { name: "Contact us" }),
    ).toHaveAttribute("aria-haspopup", "dialog");
    await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test("the footer's Contact us opens the contact form in a pop-up", async ({
    page,
  }) => {
    await page.goto("/");
    const open = page
      .getByRole("contentinfo")
      .getByRole("button", { name: "Contact us" });
    const popup = page.getByRole("dialog", { name: "Send us a message" });
    const form = popup.getByRole("form", { name: "Send us a message" });

    // Opens with the full form; on the home page the house is "General".
    await open.click();
    await expect(popup).toBeVisible();
    await expect(form.getByLabel("Home")).toHaveValue("");
    await expect(
      form.getByRole("button", { name: "Send message" }),
    ).toBeVisible();

    // Closes from the Close button, a click on the dimmed page, and Escape,
    // handing focus back to the footer button each time.
    await popup.getByRole("button", { name: "Close" }).click();
    await expect(popup).toHaveCount(0);
    await expect(open).toBeFocused();
    await open.click();
    await page.mouse.click(5, 5);
    await expect(popup).toHaveCount(0);
    await open.click();
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(open).toBeFocused();

    // Clicks inside the panel (not on a control) leave it open.
    await open.click();
    await popup.getByRole("heading", { name: "Send us a message" }).click();
    await expect(popup).toBeVisible();

    // Sending works from the pop-up. The route is intercepted so this spec
    // never spends the contact limiter (contact-form.spec covers the real post).
    await page.route("**/api/contact", (route) =>
      route.fulfill({ status: 200, json: { ok: true } }),
    );
    await form.getByLabel("Name").fill("Taylor Guest");
    await form.getByLabel("Email").fill("taylor@example.com");
    await form
      .getByLabel("Message")
      .fill("Is March free at any of the houses?");
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(popup.getByTestId("contact-form-success")).toBeVisible();

    // Reopening after a send starts with a fresh, empty form.
    await popup.getByRole("button", { name: "Close" }).click();
    await open.click();
    await expect(form.getByLabel("Name")).toHaveValue("");
  });

  test("on a house page the pop-up pre-selects that house", async ({
    page,
  }) => {
    await page.goto("/stays/south-austin");
    await page
      .getByRole("contentinfo")
      .getByRole("button", { name: "Contact us" })
      .click();
    const popup = page.getByRole("dialog", { name: "Send us a message" });
    await expect(popup.getByLabel("Home")).toHaveValue("south-austin");
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

/*
 * The TikTok player is mocked: each test serves its own page at TikTok's
 * player URL that posts what the real player would (lib/tiktok-player.ts).
 */
test.describe("TikTok click to play", () => {
  function fakePlayer(page: Page, message: object | null) {
    const script = message
      ? `<script>parent.postMessage(${JSON.stringify(JSON.stringify(message))}, "*")</script>`
      : "";
    return page.route(/tiktok\.com\/player\/v1\//, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><title>player</title>${script}`,
      }),
    );
  }

  async function pressPlay(page: Page) {
    await page.goto("/");
    const tiktok = page.getByTestId("tiktok-embed").first();
    await tiktok.scrollIntoViewIfNeeded();
    await tiktok.getByRole("link", { name: /^Play the TikTok/ }).click();
    return tiktok;
  }

  test("pressing play loads the player and drops the poster once it is ready", async ({
    page,
  }) => {
    await fakePlayer(page, { type: "onPlayerReady", "x-tiktok-player": true });
    const tiktok = await pressPlay(page);
    await expect(tiktok).toHaveAttribute("data-state", "ready");
    const frame = tiktok.locator("iframe");
    await expect(frame).toHaveAttribute(
      "src",
      /^https:\/\/www\.tiktok\.com\/player\/v1\/\d+\?autoplay=1/,
    );
    await expect(frame).toHaveAttribute(
      "title",
      /TikTok video from @exploretex/,
    );
    await expect(tiktok.getByTestId("tiktok-poster")).toHaveCount(0);
    // Only the clip that was pressed loads.
    await expect(
      page.locator('[data-testid="tiktok-embed"] iframe'),
    ).toHaveCount(1);
  });

  test("a player error shows Watch on TikTok instead of TikTok's error screen", async ({
    page,
  }) => {
    await fakePlayer(page, {
      type: "onPlayerError",
      value: { errorCode: 2001, errorType: "SERVER_ERROR" },
      "x-tiktok-player": true,
    });
    const tiktok = await pressPlay(page);
    await expect(tiktok).toHaveAttribute("data-state", "failed");
    await expect(tiktok.locator("iframe")).toHaveCount(0);
    await expect(tiktok).toContainText("TikTok isn't loading here right now.");
    const watch = tiktok.getByRole("link", { name: "Watch on TikTok" });
    await expect(watch).toHaveAttribute(
      "href",
      /tiktok\.com\/@exploretex\/video\/\d+/,
    );
    await expect(watch).toBeFocused();
  });

  test("a player that never reports ready (rate limited) falls back too", async ({
    page,
  }) => {
    await page.clock.install();
    await fakePlayer(page, null);
    const tiktok = await pressPlay(page);
    await expect(tiktok).toHaveAttribute("data-state", "loading");
    await expect(tiktok.getByRole("status")).toHaveText("Loading the player…");
    await page.clock.fastForward(10_000);
    await expect(tiktok).toHaveAttribute("data-state", "failed");
    await expect(
      tiktok.getByRole("link", { name: "Watch on TikTok" }),
    ).toBeVisible();
  });

  test("blocked autoplay is not a failure: the player shows its own play button", async ({
    page,
  }) => {
    await fakePlayer(page, {
      type: "onPlayerError",
      value: { errorCode: 3002, errorType: "AUTOPLAY_ERROR" },
      "x-tiktok-player": true,
    });
    const tiktok = await pressPlay(page);
    await expect(tiktok).toHaveAttribute("data-state", "ready");
    await expect(tiktok.locator("iframe")).toHaveCount(1);
  });
});
