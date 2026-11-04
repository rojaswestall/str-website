import { type APIRequestContext, expect, test } from "@playwright/test";

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
 * makes) and quoting it without a click.
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
