import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";

import {
  addDays,
  DAN_JEAN_A,
  FIRE_SIDE,
  nextDayOfMonth,
  nextReservedDay,
  OAK_HILL,
  pickWeekdayStay,
  pickWeekendStay,
  todayInAustin,
} from "./mock-hospitable/stays";

/*
 * Runs in the "chromium-native" project only, against the build pointed at
 * the stand-in Hospitable API. Covers the search's server side: the
 * availability route's contract over the three generated calendars, and
 * the house page adopting a stay from its URL (the hand-off a search result
 * makes) and quoting it without a click. Then the home-page search bar: the
 * site's own form in place of Hospitable's, submitting the URL contract
 * with and without JavaScript. Then the /search page: results rendered on
 * the server from that URL, the whole path from the hero to a quoted house
 * page, each refusal the three calendars can produce, the URLs that are
 * "no dates", a new search from the bar, and axe.
 *
 * Stand-in numbers (e2e/mock-hospitable/server.mjs): a weekday night is
 * $112 base at South Austin (direct preview $124), $130 at Oak Hill ($144,
 * the configured 11% fallback) and $98 at Fire Side ($109). A priced
 * three-weekday-night stay at South Austin totals $613.04 (see
 * booking.native.spec.ts for the arithmetic).
 */

const ORDER = ["oak-hill", "south-austin", "fire-side"];

async function search(
  request: APIRequestContext,
  params: Record<string, string>,
  address = "203.0.113.200",
) {
  const query = new URLSearchParams(params).toString();
  return request.get(`/api/availability?${query}`, {
    headers: { "x-forwarded-for": address },
  });
}

type Result = {
  slug: string;
  stay: { available: boolean; reason?: string; minStay?: number };
};

function verdicts(results: Result[]): Record<string, string> {
  return Object.fromEntries(
    results.map((r) => [
      r.slug,
      r.stay.available
        ? "free"
        : `${r.stay.reason}${r.stay.minStay ? `:${r.stay.minStay}` : ""}`,
    ]),
  );
}

/**
 * A stay over South Austin's reserved 10th–12th that starts in the future
 * whatever today is: the run is looked for two days out, so the check-in,
 * two days before the 11th, is never in the past (from `nextReservedDay(today)`
 * it would be yesterday on the 10th of a month).
 */
function blockedStay(today: string) {
  const reserved = nextReservedDay(addDays(today, 2));
  return { checkIn: addDays(reserved, -2), checkOut: addDays(reserved, 1) };
}

test.describe("GET /api/availability", () => {
  test("answers for all three houses with calendar estimates, never cached", async ({
    request,
  }) => {
    const stay = pickWeekdayStay(todayInAustin());
    const response = await search(request, {
      checkin: stay.checkIn,
      checkout: stay.checkOut,
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");

    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      nights: 3,
    });
    expect(body.results.map((r: Result) => r.slug)).toEqual(ORDER);

    const [oakHill, southAustin, fireSide] = body.results;
    expect(southAustin).toMatchObject({
      id: DAN_JEAN_A,
      name: "South Austin Stay",
      bedrooms: 3,
      maxGuests: 8,
      petsAllowed: true,
      currency: "USD",
      heroImage: { src: expect.stringMatching(/^\/photos\//) },
      stay: {
        available: true,
        nights: 3,
        nightly: { min: 12400, max: 12400 },
        estimatedNightlyTotal: 37200,
      },
    });
    expect(oakHill).toMatchObject({
      id: OAK_HILL,
      stay: { available: true, nightly: { min: 14400, max: 14400 } },
    });
    expect(fireSide).toMatchObject({
      id: FIRE_SIDE,
      maxGuests: 4,
      petsAllowed: false,
      stay: { available: true, estimatedNightlyTotal: 32700 },
    });
    // Only what a card needs: no markups, Airbnb link, or check-in times.
    for (const result of body.results) {
      expect(result).not.toHaveProperty("markups");
      expect(result).not.toHaveProperty("airbnbUrl");
      expect(result).not.toHaveProperty("checkInTime");
    }
  });

  test("reports why a house is not free, by the widget's own rules", async ({
    request,
  }) => {
    const today = todayInAustin();

    // Crossing South Austin's reserved 10th–12th.
    const crossing = blockedStay(today);
    const blocked = await search(request, {
      checkin: crossing.checkIn,
      checkout: crossing.checkOut,
    });
    expect(verdicts((await blocked.json()).results)).toEqual({
      "oak-hill": "free",
      "south-austin": "unavailable",
      "fire-side": "free",
    });

    // Two nights from a Friday: Oak Hill wants three.
    const weekend = pickWeekendStay(today);
    const friday = await search(request, {
      checkin: weekend.checkIn,
      checkout: weekend.checkOut,
    });
    expect(verdicts((await friday.json()).results)).toEqual({
      "oak-hill": "min-stay:3",
      "south-austin": "free",
      "fire-side": "free",
    });

    // One night midweek: only Fire Side has no minimum.
    const weekdays = pickWeekdayStay(today);
    const oneNight = await search(request, {
      checkin: weekdays.checkIn,
      checkout: addDays(weekdays.checkIn, 1),
    });
    expect(verdicts((await oneNight.json()).results)).toEqual({
      "oak-hill": "min-stay:2",
      "south-austin": "min-stay:2",
      "fire-side": "free",
    });

    // South Austin's 20th is closed to arrival.
    const twentieth = nextDayOfMonth(today, 20);
    const closed = await search(request, {
      checkin: twentieth,
      checkout: addDays(twentieth, 2),
    });
    expect(verdicts((await closed.json()).results)["south-austin"]).toBe(
      "closed-to-arrival",
    );

    // Six people, then a pet: Fire Side sleeps four and takes no pets.
    const crowd = await search(request, {
      checkin: weekdays.checkIn,
      checkout: weekdays.checkOut,
      adults: "3",
      children: "3",
    });
    expect(verdicts((await crowd.json()).results)).toEqual({
      "oak-hill": "free",
      "south-austin": "free",
      "fire-side": "max-guests",
    });
    const pets = await search(request, {
      checkin: weekdays.checkIn,
      checkout: weekdays.checkOut,
      pets: "1",
    });
    expect(verdicts((await pets.json()).results)).toEqual({
      "oak-hill": "free",
      "south-austin": "free",
      "fire-side": "pets",
    });
  });

  test("rejects bad input with field errors and other methods with 405", async ({
    request,
  }) => {
    const today = todayInAustin();
    const stay = pickWeekdayStay(today);

    const malformed = await search(request, {
      checkin: "soon",
      checkout: stay.checkOut,
      adults: "0",
      pets: "9",
    });
    expect(malformed.status()).toBe(400);
    const body = await malformed.json();
    expect(body.code).toBe("INVALID");
    expect(body.errors).toMatchObject({
      checkin: expect.stringMatching(/2027-03-12/),
      adults: expect.any(String),
      pets: expect.any(String),
    });

    const empty = await search(request, {});
    expect(empty.status()).toBe(400);
    expect(Object.keys((await empty.json()).errors).sort()).toEqual([
      "checkin",
      "checkout",
    ]);

    const past = await search(request, {
      checkin: addDays(today, -3),
      checkout: addDays(today, -1),
    });
    expect((await past.json()).errors.checkin).toMatch(/past/);

    const backwards = await search(request, {
      checkin: stay.checkOut,
      checkout: stay.checkIn,
    });
    expect((await backwards.json()).errors.checkout).toMatch(/after/);

    const long = await search(request, {
      checkin: stay.checkIn,
      checkout: addDays(stay.checkIn, 91),
    });
    expect((await long.json()).errors.checkout).toMatch(/90 nights/);

    const post = await request.post("/api/availability", {
      data: { checkin: stay.checkIn, checkout: stay.checkOut },
    });
    expect(post.status()).toBe(405);
  });

  test("rate-limits a client at 60 searches a minute", async ({
    request,
  }, testInfo) => {
    const stay = pickWeekdayStay(todayInAustin());
    const address = `203.0.113.${1 + (testInfo.parallelIndex % 50)}`;
    const params = { checkin: stay.checkIn, checkout: stay.checkOut };
    for (let i = 0; i < 60; i++) {
      expect((await search(request, params, address)).status()).toBe(200);
    }
    const limited = await search(request, params, address);
    expect(limited.status()).toBe(429);
    expect((await limited.json()).code).toBe("RATE_LIMITED");
    expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
  });
});

test.describe("house page prefilled from the URL", () => {
  test("adopts a valid stay and guests and quotes it without a click", async ({
    page,
  }) => {
    const stay = pickWeekdayStay(todayInAustin());
    await page.goto(
      `/stays/south-austin?checkin=${stay.checkIn}&checkout=${stay.checkOut}&adults=3`,
    );
    const widget = page.getByTestId("booking-widget");
    const footer = page.getByTestId("booking-footer");

    await expect(footer).toContainText("3 nights");
    await expect(footer).toContainText("$613.04", { timeout: 15_000 });
    await expect(widget.getByText("3 guests", { exact: true })).toBeVisible();
    await expect(
      widget.locator(`[role="gridcell"][data-date="${stay.checkIn}"]`),
    ).toHaveAttribute("aria-label", /selected as check-in/);
    await expect(
      widget.locator(`[role="gridcell"][data-date="${stay.checkOut}"]`),
    ).toHaveAttribute("aria-label", /selected as check-out/);
    // The widget's own events fire for the prefilled quote; no selection event.
    await expect(widget.getByText("$124.32 × 3 nights")).toBeVisible();
  });

  test("drops a check-out it cannot use and keeps the check-in", async ({
    page,
  }) => {
    const today = todayInAustin();
    const stay = pickWeekdayStay(today);

    // Not a date at all: dropped on the server.
    await page.goto(
      `/stays/south-austin?checkin=${stay.checkIn}&checkout=not-a-date&adults=2`,
    );
    const widget = page.getByTestId("booking-widget");
    const footer = page.getByTestId("booking-footer");
    await expect(footer).toContainText("Choose a check-out date");
    await expect(
      widget.locator(`[role="gridcell"][data-date="${stay.checkIn}"]`),
    ).toHaveAttribute("aria-label", /selected as check-in/);
    expect(await widget.locator('[aria-selected="true"]').count()).toBe(1);

    // A real date the calendar refuses (the stay crosses reserved nights):
    // dropped by the widget against the calendar.
    const { checkIn, checkOut } = blockedStay(today);
    await page.goto(
      `/stays/south-austin?checkin=${checkIn}&checkout=${checkOut}`,
    );
    await expect(footer).toContainText("Choose a check-out date");
    await expect(
      widget.locator(`[role="gridcell"][data-date="${checkIn}"]`),
    ).toHaveAttribute("aria-label", /selected as check-in/);
    expect(await widget.locator('[aria-selected="true"]').count()).toBe(1);
  });

  test("ignores a past check-in and clamps the guests to the house", async ({
    page,
  }) => {
    const today = todayInAustin();
    await page.goto(
      `/stays/south-austin?checkin=${addDays(today, -2)}&checkout=${addDays(today, 1)}&adults=12&pets=1`,
    );
    const widget = page.getByTestId("booking-widget");
    await expect(page.getByTestId("booking-footer")).toContainText(
      "Select dates to see price",
    );
    await expect(widget.getByRole("grid").first()).toBeVisible();
    expect(await widget.locator('[aria-selected="true"]').count()).toBe(0);
    // 12 adults is more than the house sleeps, so the party is clamped to
    // its capacity the way any change in the picker would be.
    await expect(widget.getByText("8 guests · 1 pet")).toBeVisible();
  });
});

/* ------------------------------------------------------------------------ */
/* The home-page search bar                                                 */
/* ------------------------------------------------------------------------ */

/** Hospitable's hosts: the embed's library, loader, API and checkout. */
const HOSPITABLE_HOSTS = /hospitable\.com|hsptb\.com|hospitable\.b-cdn\.net/;

/** The URL the bar must land on for a stay with three adults. */
function searchUrl(stay: { checkIn: string; checkOut: string }, adults = 3) {
  return `/search?checkin=${stay.checkIn}&checkout=${stay.checkOut}&adults=${adults}&children=0&infants=0&pets=0`;
}

/**
 * The hero bar, hydrated: the stub's frame is gone and the form has swapped
 * its no-script inputs for the popover fields. TikTok stays off the network
 * like every spec that loads `/`.
 */
async function openHome(page: Page): Promise<Locator> {
  await page.route(/tiktok(cdn-us)?\.com/, (route) => route.abort());
  await page.goto("/");
  const bar = page.getByTestId("search-bar");
  await expect(bar).toHaveAttribute("data-hydrated", "true");
  return bar;
}

async function pickDate(dialog: Locator, date: string) {
  const cell = dialog.locator(`[role="gridcell"][data-date="${date}"]`);
  for (let i = 0; i < 4 && !(await cell.isVisible()); i++) {
    await dialog.getByRole("button", { name: "Next month" }).click();
  }
  await expect(cell).toBeVisible();
  await cell.click();
}

test.describe("home-page search bar", () => {
  test("replaces Hospitable's bar in the hero and never calls its hosts", async ({
    page,
  }) => {
    const hospitable: string[] = [];
    page.on("request", (request) => {
      if (HOSPITABLE_HOSTS.test(request.url())) hospitable.push(request.url());
    });

    const bar = await openHome(page);
    await expect(bar).toHaveRole("search");
    await expect(bar).toHaveAttribute("action", "/search");
    await expect(bar).toHaveAttribute("method", "get");
    await expect(bar).toContainText("Search all 3 houses");
    for (const name of ["Check-in", "Checkout", "Guests"]) {
      await expect(bar.getByRole("button", { name })).toBeVisible();
    }
    await expect(bar.getByRole("button", { name: "Search" })).toBeVisible();
    // The frame sits under the hero's label, where the embed and stub were.
    await expect(page.getByText("Check dates across all three")).toBeVisible();
    await expect(page.getByTestId("hospitable-search")).toHaveCount(0);
    await expect(page.getByTestId("hospitable-search-stub")).toHaveCount(0);
    await expect(
      page.locator('script[src*="hospitable-search-widget"]'),
    ).toHaveCount(0);
    expect(hospitable).toEqual([]);
  });

  test("submits dates and three adults to /search with exactly those parameters", async ({
    page,
  }) => {
    const stay = pickWeekdayStay(todayInAustin());
    const events: { type: string; detail: unknown }[] = [];
    await page.exposeFunction(
      "__recordSearchEvent",
      (event: { type: string; detail: unknown }) => {
        events.push(event);
      },
    );
    await page.addInitScript(() => {
      document.addEventListener("search_submitted", (event) => {
        (
          window as unknown as {
            __recordSearchEvent: (e: { type: string; detail: unknown }) => void;
          }
        ).__recordSearchEvent({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
      });
    });

    const bar = await openHome(page);

    // An empty submit opens the calendar and says why, instead of navigating.
    await bar.getByRole("button", { name: "Search" }).click();
    const dates = bar.getByRole("dialog", { name: "Choose your dates" });
    await expect(dates).toBeVisible();
    await expect(bar.getByRole("status")).toHaveText("Choose your dates first");
    await expect(page).toHaveURL("/");

    // No prices in this calendar: the nights are only numbered.
    await expect(
      dates.locator('[role="gridcell"][data-date]').first(),
    ).not.toContainText("$");
    await pickDate(dates, stay.checkIn);
    await expect(dates).toBeVisible();
    await pickDate(dates, stay.checkOut);
    // Picking the check-out closes the dialog and returns focus to the field.
    await expect(dates).toHaveCount(0);
    await expect(bar.getByRole("button", { name: /Check-in/ })).toBeFocused();
    await expect(bar.getByRole("button", { name: /Check-in/ })).toContainText(
      /[A-Z][a-z]{2} \d{1,2}/,
    );

    const guestsField = bar.getByRole("button", { name: /Guests/ });
    await guestsField.click();
    const guests = bar.getByRole("dialog", { name: "Guests" });
    await expect(guests).toBeVisible();
    await guests.getByRole("button", { name: "Add one of adults" }).click();
    await expect(guestsField).toContainText("3 adults");
    await page.keyboard.press("Escape");
    await expect(guests).toHaveCount(0);
    await expect(guestsField).toBeFocused();

    await bar.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(searchUrl(stay));
    // The results page itself is covered in its own block below.
    await expect(
      page.getByRole("heading", { level: 1, name: "Which house is free?" }),
    ).toBeVisible();

    expect(events).toEqual([
      {
        type: "search_submitted",
        detail: {
          checkin: stay.checkIn,
          checkout: stay.checkOut,
          adults: 3,
          children: 0,
          infants: 0,
          pets: 0,
        },
      },
    ]);
  });

  test("submits the same URL without JavaScript", async ({
    browser,
  }, testInfo) => {
    const stay = pickWeekdayStay(todayInAustin());
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    try {
      await page.route(/tiktok(cdn-us)?\.com/, (route) => route.abort());
      await page.goto("/");
      const bar = page.getByTestId("search-bar");
      await expect(bar).toBeVisible();
      await expect(bar).not.toHaveAttribute("data-hydrated", "true");

      const checkIn = bar.getByLabel("Check-in");
      await expect(checkIn).toHaveAttribute("min", todayInAustin());
      await checkIn.fill(stay.checkIn);
      await bar.getByLabel("Checkout").fill(stay.checkOut);
      // The guests are a native disclosure of number inputs.
      await bar.locator("summary").click();
      await bar.getByLabel("Adults").fill("3");
      await bar.getByRole("button", { name: "Search" }).click();

      await expect(page).toHaveURL(searchUrl(stay));
      await expect(
        page.getByRole("heading", { level: 1, name: "Which house is free?" }),
      ).toBeVisible();
      // The results stream into a Suspense boundary, which only a script
      // reveals: without one the page says so and offers the houses.
      // (Playwright only stops scripts running, so Chromium still parses
      // `noscript` as text: the note is checked in the markup, not on screen.)
      await expect(
        page.locator('[data-testid="search-results-skeleton"]:visible'),
      ).toContainText("Checking the calendars");
      await expect(page.getByTestId("search-results")).toBeHidden();
      expect(await page.content()).toContain("The results need JavaScript");
      await expect(
        page
          .getByRole("navigation", { name: "The houses" })
          .getByRole("link", { name: "South Austin Stay" }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("passes axe in both themes, with the date picker open", async ({
    page,
  }) => {
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      const bar = await openHome(page);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("[data-theme-toggle]")).toHaveAttribute(
        "data-mode",
        "system",
      );

      const closed = await new AxeBuilder({ page }).analyze();
      await bar.getByRole("button", { name: /Check-in/ }).click();
      await expect(
        bar.getByRole("dialog", { name: "Choose your dates" }),
      ).toBeVisible();
      const open = await new AxeBuilder({ page }).analyze();

      for (const [label, results] of [
        ["closed", closed],
        ["open", open],
      ] as const) {
        const blocking = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(
          blocking.map(
            (v) =>
              `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          ),
          `axe (${theme}, picker ${label})`,
        ).toEqual([]);
      }
    }
  });
});

/* ------------------------------------------------------------------------ */
/* The /search results page                                                 */
/* ------------------------------------------------------------------------ */

const GUESTS_ONLY = "adults=2&children=0&infants=0&pets=0";

/** "Fri, Mar 12": the results headline's date, as `formatWeekdayDate` writes it. */
function weekdayDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

/** "Mar 12": a date in one of the bar's fields. */
function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

/**
 * The bar on screen. While the page streams there are two for a moment (the
 * prerendered one and the one prefilled from the URL), and after a
 * client-side navigation the previous page's bar is kept, hidden.
 */
function visibleBar(page: Page): Locator {
  return page.locator('[data-testid="search-bar"]:visible');
}

/** Opens /search with a query string and waits for the streamed results. */
async function openSearch(page: Page, query = ""): Promise<Locator> {
  await page.goto(`/search${query ? `?${query}` : ""}`);
  const results = page.getByTestId("search-results");
  await expect(results).toBeVisible();
  await expect(visibleBar(page)).toHaveAttribute("data-hydrated", "true");
  return results;
}

function card(results: Locator, slug: string): Locator {
  return results.locator(`[data-testid="search-result"][data-slug="${slug}"]`);
}

async function slugs(results: Locator): Promise<(string | null)[]> {
  return results
    .getByTestId("search-result")
    .evaluateAll((cards) => cards.map((c) => c.getAttribute("data-slug")));
}

test.describe("/search results page", () => {
  test("goes from the hero bar to a result card to a house page already quoted", async ({
    page,
  }) => {
    const stay = pickWeekdayStay(todayInAustin());
    const bar = await openHome(page);
    await bar.getByRole("button", { name: /Check-in/ }).click();
    const dates = bar.getByRole("dialog", { name: "Choose your dates" });
    await pickDate(dates, stay.checkIn);
    await pickDate(dates, stay.checkOut);
    await bar.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(searchUrl(stay, 2));

    // The page keeps its frame around the native results.
    await expect(
      page.getByRole("heading", { level: 1, name: "Which house is free?" }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(
      page
        .getByRole("navigation", { name: "The houses" })
        .getByRole("link", { name: "Fire Side Home" }),
    ).toHaveAttribute("href", "/stays/fire-side");
    await expect(page.locator("hospitable-direct-mps")).toHaveCount(0);
    await expect(page.getByTestId("hospitable-search-stub")).toHaveCount(0);

    // The bar on /search holds the stay that was searched.
    const searchBar = visibleBar(page);
    await expect(
      searchBar.getByRole("button", { name: /Check-in/ }),
    ).toContainText(shortDate(stay.checkIn));
    await expect(
      searchBar.getByRole("button", { name: /Checkout/ }),
    ).toContainText(shortDate(stay.checkOut));

    const results = page.getByTestId("search-results");
    await expect(results).toHaveAttribute("data-state", "results");
    await expect(results.getByRole("heading", { level: 2 })).toHaveText(
      `All 3 houses are free for ${weekdayDate(stay.checkIn)} → ${weekdayDate(stay.checkOut)} · 3 nights`,
    );
    // Estimates, said to be estimates; the price is on the house page.
    await expect(results).toContainText("The figures are estimates");
    await expect(results).toContainText(
      "The price is the quote on the house page.",
    );
    expect(await slugs(results)).toEqual(ORDER);

    const southAustin = card(results, "south-austin");
    await expect(southAustin.getByRole("heading", { level: 3 })).toHaveText(
      "South Austin Stay",
    );
    await expect(southAustin).toContainText("3 bed · 2 bath · up to 8 guests");
    await expect(southAustin).toContainText("from $124 / night");
    await expect(southAustin).toContainText(
      "about $372 for 3 nights, before fees and taxes",
    );
    await expect(southAustin.locator("img")).toHaveAttribute("sizes", /vw/);
    await expect(card(results, "oak-hill")).toContainText("from $144 / night");
    await expect(card(results, "fire-side")).toContainText(
      "about $327 for 3 nights, before fees and taxes",
    );

    const book = southAustin.getByRole("link", {
      name: /See the price and book/,
    });
    await expect(book).toHaveAttribute(
      "href",
      `/stays/south-austin?checkin=${stay.checkIn}&checkout=${stay.checkOut}&${GUESTS_ONLY}`,
    );
    await book.click();
    await expect(page).toHaveURL(
      `/stays/south-austin?checkin=${stay.checkIn}&checkout=${stay.checkOut}&${GUESTS_ONLY}`,
    );
    // The house page quotes the stay on arrival: the total is in the footer
    // without another click.
    const footer = page.getByTestId("booking-footer");
    await expect(footer).toContainText("3 nights");
    await expect(footer).toContainText("$613.04", { timeout: 15_000 });
  });

  test("renders the results on the server: no client fetch, nothing to Hospitable", async ({
    page,
    request,
  }) => {
    const stay = pickWeekdayStay(todayInAustin());
    const query = `checkin=${stay.checkIn}&checkout=${stay.checkOut}`;
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));

    const results = await openSearch(page, query);
    await expect(results.getByTestId("search-result")).toHaveCount(3);
    await page.waitForLoadState("networkidle");
    expect(requests.filter((url) => /\/api\//.test(url))).toEqual([]);
    expect(requests.filter((url) => HOSPITABLE_HOSTS.test(url))).toEqual([]);
    await expect(page.getByTestId("hospitable-search")).toHaveCount(0);

    // The answer is in the document the server sent, streamed after the shell.
    // (React marks the joins between text and values with empty comments.)
    const html = (
      await (await request.get(`/search?${query}`)).text()
    ).replaceAll("<!-- -->", "");
    expect(html).toContain("All 3 houses are free for");
    expect(html).toContain("See the price and book");
    expect(html).toContain("from $124 / night");
  });

  test("lists a house that is not free last, with the reason and its calendar", async ({
    page,
  }) => {
    const today = todayInAustin();

    // Crossing South Austin's reserved 10th–12th.
    const blocked = blockedStay(today);
    let results = await openSearch(
      page,
      `checkin=${blocked.checkIn}&checkout=${blocked.checkOut}`,
    );
    await expect(results.getByRole("heading", { level: 2 })).toContainText(
      "2 of 3 houses are free for",
    );
    expect(await slugs(results)).toEqual([
      "oak-hill",
      "fire-side",
      "south-austin",
    ]);
    const southAustin = card(results, "south-austin");
    await expect(southAustin).toHaveAttribute("data-available", "false");
    await expect(southAustin).toContainText("Not free for these dates");
    await expect(southAustin).toContainText("Booked for some of those nights");
    await expect(southAustin).not.toContainText("$");
    await expect(
      southAustin.getByRole("link", { name: /See the price and book/ }),
    ).toHaveCount(0);
    await expect(
      southAustin.getByRole("link", { name: /See the calendar/ }),
    ).toHaveAttribute("href", `/stays/south-austin?${GUESTS_ONLY}`);
    await expect(card(results, "oak-hill")).toHaveAttribute(
      "data-available",
      "true",
    );

    // One night from a Friday: Oak Hill wants three, South Austin two.
    const friday = pickWeekendStay(today).checkIn;
    const oneNight = `checkin=${friday}&checkout=${addDays(friday, 1)}`;
    results = await openSearch(page, oneNight);
    await expect(results.getByRole("heading", { level: 2 })).toHaveText(
      `1 of 3 houses is free for ${weekdayDate(friday)} → ${weekdayDate(addDays(friday, 1))} · 1 night`,
    );
    expect(await slugs(results)).toEqual([
      "fire-side",
      "oak-hill",
      "south-austin",
    ]);
    await expect(card(results, "oak-hill")).toContainText(
      "Needs a 3-night minimum on those dates",
    );
    await expect(card(results, "south-austin")).toContainText(
      "Needs a 2-night minimum on those dates",
    );
    await expect(card(results, "fire-side")).toContainText(
      "about $155 for 1 night, before fees and taxes",
    );

    // Six adults: Fire Side sleeps four. The guests ride along to its page.
    const weekdays = pickWeekdayStay(today);
    const midweek = `checkin=${weekdays.checkIn}&checkout=${weekdays.checkOut}`;
    results = await openSearch(page, `${midweek}&adults=6`);
    const fireSide = card(results, "fire-side");
    await expect(fireSide).toContainText("Sleeps up to 4");
    await expect(
      fireSide.getByRole("link", { name: /See the calendar/ }),
    ).toHaveAttribute(
      "href",
      "/stays/fire-side?adults=6&children=0&infants=0&pets=0",
    );
    await expect(
      visibleBar(page).getByRole("button", { name: /Guests/ }),
    ).toContainText("6 adults");
    expect(await slugs(results)).toEqual([
      "oak-hill",
      "south-austin",
      "fire-side",
    ]);

    // A pet: Fire Side takes none.
    results = await openSearch(page, `${midweek}&pets=1`);
    await expect(card(results, "fire-side")).toContainText(
      "No pets at this house",
    );
    await expect(
      card(results, "oak-hill").getByRole("link", {
        name: /See the price and book/,
      }),
    ).toHaveAttribute(
      "href",
      `/stays/oak-hill?${midweek}&adults=2&children=0&infants=0&pets=1`,
    );

    // Every house refused: said plainly, with the calendars on offer.
    results = await openSearch(page, `${oneNight}&adults=5`);
    await expect(results.getByRole("heading", { level: 2 })).toContainText(
      "No house is free for",
    );
    await expect(results).toContainText("Try other dates above");
    await expect(results).not.toContainText("estimates");
    await expect(
      results.getByRole("link", { name: /See the calendar/ }),
    ).toHaveCount(3);
    await expect(
      results.getByRole("link", { name: /See the price and book/ }),
    ).toHaveCount(0);
  });

  test("without a usable stay, invites the guest to pick dates over three plain cards", async ({
    page,
  }) => {
    const today = todayInAustin();
    const stay = pickWeekdayStay(today);

    async function expectInvitation(results: Locator) {
      await expect(results).toHaveAttribute("data-state", "invitation");
      await expect(results.getByRole("heading", { level: 2 })).toHaveText(
        "Pick your dates to see which houses are free",
      );
      expect(await slugs(results)).toEqual(ORDER);
      // No claim either way: no verdict, no figure, only the calendars.
      for (const slug of ORDER) {
        const house = card(results, slug);
        await expect(house).not.toHaveAttribute("data-available");
        await expect(house).not.toContainText("$");
        await expect(house).not.toContainText(/free/i);
      }
      await expect(
        results.getByRole("link", { name: /See the calendar/ }),
      ).toHaveCount(3);
    }
    const field = (name: RegExp) =>
      visibleBar(page).getByRole("button", { name });

    // No parameters at all.
    let results = await openSearch(page);
    await expectInvitation(results);
    await expect(field(/Check-in/)).toContainText("Add date");
    await expect(field(/Checkout/)).toContainText("Add date");
    await expect(field(/Guests/)).toContainText("2 adults");
    await expect(
      card(results, "oak-hill").getByRole("link", { name: /See the calendar/ }),
    ).toHaveAttribute("href", `/stays/oak-hill?${GUESTS_ONLY}`);

    // Not a date: the bar stays empty.
    results = await openSearch(page, "checkin=bad");
    await expectInvitation(results);
    await expect(field(/Check-in/)).toContainText("Add date");

    // In the past: both dates dropped, the guests kept.
    results = await openSearch(
      page,
      `checkin=${addDays(today, -3)}&checkout=${addDays(today, 2)}&adults=4`,
    );
    await expectInvitation(results);
    await expect(field(/Check-in/)).toContainText("Add date");
    await expect(field(/Guests/)).toContainText("4 adults");

    // A check-out not after the check-in: the check-in is kept.
    results = await openSearch(
      page,
      `checkin=${stay.checkOut}&checkout=${stay.checkIn}`,
    );
    await expectInvitation(results);
    await expect(field(/Check-in/)).toContainText(shortDate(stay.checkOut));
    await expect(field(/Checkout/)).toContainText("Add date");

    // Longer than MAX_NIGHTS: the same, and the page says why.
    results = await openSearch(
      page,
      `checkin=${stay.checkIn}&checkout=${addDays(stay.checkIn, 91)}`,
    );
    await expectInvitation(results);
    await expect(results).toContainText("Stays are limited to 90 nights");
    await expect(field(/Check-in/)).toContainText(shortDate(stay.checkIn));
    await expect(field(/Checkout/)).toContainText("Add date");
  });

  test("a new search from the bar shows the skeleton, then the new results; back and forward restore each", async ({
    page,
  }) => {
    const today = todayInAustin();
    const first = pickWeekdayStay(today);
    const second = pickWeekendStay(today);
    const results = await openSearch(
      page,
      `checkin=${first.checkIn}&checkout=${first.checkOut}`,
    );
    const heading = results.getByRole("heading", { level: 2 });
    await expect(heading).toContainText("All 3 houses are free for");

    const bar = visibleBar(page);
    const checkIn = bar.getByRole("button", { name: /Check-in/ });
    await checkIn.click();
    const dates = bar.getByRole("dialog", { name: "Choose your dates" });
    await pickDate(dates, second.checkIn);
    await pickDate(dates, second.checkOut);
    await expect(dates).toHaveCount(0);

    // Hold the navigation's response so the pending state can be seen.
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/\/search\?.*_rsc=/, async (route) => {
      await held;
      await route.continue();
    });

    await bar.getByRole("button", { name: "Search" }).click();
    await expect(bar).toHaveAttribute("data-pending", "");
    const skeleton = page.locator(
      '[data-testid="search-results-skeleton"]:visible',
    );
    await expect(skeleton).toHaveCount(1);
    await expect(skeleton).toContainText("Checking the calendars");
    await expect(results).toBeHidden();

    release();
    await expect(page).toHaveURL(searchUrl(second, 2));
    await expect(heading).toHaveText(
      `2 of 3 houses are free for ${weekdayDate(second.checkIn)} → ${weekdayDate(second.checkOut)} · 2 nights`,
    );
    await expect(bar).not.toHaveAttribute("data-pending");
    await expect(skeleton).toHaveCount(0);
    await expect(card(results, "oak-hill")).toContainText(
      "Needs a 3-night minimum on those dates",
    );
    // The same bar, still focused where the guest left it.
    await expect(bar.getByRole("button", { name: "Search" })).toBeFocused();
    await page.unroute(/\/search\?.*_rsc=/);

    // The URL is the state: back and forward bring back results and bar.
    await page.goBack();
    await expect(page).toHaveURL(
      `/search?checkin=${first.checkIn}&checkout=${first.checkOut}`,
    );
    await expect(heading).toContainText("All 3 houses are free for");
    await expect(checkIn).toContainText(shortDate(first.checkIn));

    await page.goForward();
    await expect(page).toHaveURL(searchUrl(second, 2));
    await expect(heading).toContainText("2 of 3 houses are free for");
    await expect(checkIn).toContainText(shortDate(second.checkIn));
  });

  test("passes axe in both themes, with results and with the invitation", async ({
    page,
  }) => {
    const blocked = blockedStay(todayInAustin());
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      for (const query of [
        `checkin=${blocked.checkIn}&checkout=${blocked.checkOut}`,
        "",
      ]) {
        await openSearch(page, query);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("[data-theme-toggle]")).toHaveAttribute(
          "data-mode",
          "system",
        );
        const { violations } = await new AxeBuilder({ page }).analyze();
        const blocking = violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(
          blocking.map(
            (v) =>
              `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          ),
          `axe (${theme}, ${query ? "results" : "invitation"})`,
        ).toEqual([]);
      }
    }
  });
});
