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
 * with and without JavaScript.
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
    const reserved = nextReservedDay(today);
    const blocked = await search(request, {
      checkin: addDays(reserved, -2),
      checkout: addDays(reserved, 1),
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
    const reserved = nextReservedDay(today);
    const checkIn = addDays(reserved, -2);
    await page.goto(
      `/stays/south-austin?checkin=${checkIn}&checkout=${addDays(reserved, 1)}`,
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
    // /search is still the embed's page until its own checkpoint; it loads.
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
