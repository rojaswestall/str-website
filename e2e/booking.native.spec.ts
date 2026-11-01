import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";

import { E2E_ADMIN_TOKEN } from "../playwright.config";

/*
 * Runs in the "chromium-native" project only, against the third build made
 * with NEXT_PUBLIC_HOSPITABLE_MODE=native and pointed at the stand-in
 * Hospitable API in e2e/mock-hospitable/server.mjs. Everything between the
 * browser and that stand-in is real: the server component that seeds the
 * widget, the /api routes, the cache, the retry (the stand-in fails the
 * first calendar read on purpose), and the widget itself.
 *
 * The stand-in's calendar is generated, so these numbers hold on any date:
 * weekdays $112.00 base (direct preview $124, Airbnb estimate $129), the
 * 10th–12th RESERVED, the 20th closed to check-in, 2-night minimum. A stay
 * of three weekday nights is priced
 *   nights  3 × 11200 × 1.11 = 37296
 *   cleaning                   15100
 *   taxes   6% + 11% of 52396 = 3144 + 5764
 *   total                      61304        → $613.04
 * and on Airbnb the nights would be 3 × 12900 = 38700, a $14.04 saving, so
 * the struck-through footer figure is 61304 + 1404 = 62708 → $627.08.
 */

const DAN_JEAN_A = "02f700e5-a510-4c4f-b9f6-9d4bebdf499a";
const EVENTS = [
  "widget_loaded",
  "dates_selected",
  "quote_shown",
  "comparison_shown",
  "reserve_clicked",
] as const;

function todayInAustin(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function weekday(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

/** Monday → Thursday, all clear of the stand-in's reserved and closed days. */
function pickWeekdayStay(today: string): { checkIn: string; checkOut: string } {
  let date = addDays(today, 2);
  for (let i = 0; i < 60; i++, date = addDays(date, 1)) {
    if (weekday(date) !== 1) continue;
    const nights = [date, addDays(date, 1), addDays(date, 2)];
    const checkOut = addDays(date, 3);
    const clear = [...nights, checkOut].every((d) => {
      const dom = dayOfMonth(d);
      return dom < 10 || dom > 12;
    });
    if (clear && dayOfMonth(date) !== 20) return { checkIn: date, checkOut };
  }
  throw new Error("no clear weekday stay found");
}

/** The first of the 10th–12th run that is still ahead of today. */
function nextReservedDay(today: string): string {
  let date = addDays(today, 1);
  for (let i = 0; i < 40; i++, date = addDays(date, 1)) {
    if (dayOfMonth(date) === 11) return date;
  }
  throw new Error("unreachable");
}

async function clickDate(widget: Locator, date: string) {
  const cell = widget.locator(`[role="gridcell"][data-date="${date}"]`);
  for (let i = 0; i < 4 && !(await cell.isVisible()); i++) {
    await widget.getByRole("button", { name: "Next month" }).click();
  }
  await expect(cell).toBeVisible();
  await cell.click();
}

type RecordedEvent = { type: string; detail: unknown };

/**
 * Collects the widget's DOM events on the Node side, through an exposed
 * function, so the record survives the navigation to checkout.
 */
async function recordEvents(page: Page): Promise<RecordedEvent[]> {
  const events: RecordedEvent[] = [];
  await page.exposeFunction("__recordBookingEvent", (event: RecordedEvent) => {
    events.push(event);
  });
  await page.addInitScript((names: readonly string[]) => {
    const record = (
      window as unknown as {
        __recordBookingEvent: (event: RecordedEvent) => void;
      }
    ).__recordBookingEvent;
    for (const name of names) {
      document.addEventListener(name, (event) => {
        record({ type: name, detail: (event as CustomEvent).detail });
      });
    }
  }, EVENTS);
  return events;
}

async function priceStay(page: Page, widget: Locator) {
  const stay = pickWeekdayStay(todayInAustin());
  await clickDate(widget, stay.checkIn);
  await clickDate(widget, stay.checkOut);
  const footer = page.getByTestId("booking-footer");
  await expect(footer).toContainText("$613.04", { timeout: 15_000 });
  return { stay, footer };
}

async function fillGuest(page: Page, lastName: string) {
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill(lastName);
  await page.getByLabel("Email").fill("test.guest@austincollection.test");
  await page.getByLabel("Phone").fill("+1 512 555 0123");
}

/** The hosted checkout is never reached; the navigation is answered locally. */
async function interceptCheckout(page: Page) {
  const urls: string[] = [];
  await page.route("https://booking.hospitable.com/**", async (route) => {
    urls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>checkout stand-in</title><p>checkout</p>",
    });
  });
  return urls;
}

test.describe("native booking widget", () => {
  test("arrives server-rendered with today's priced calendar and makes no request until dates are picked", async ({
    page,
  }) => {
    const apiRequests: string[] = [];
    const offsite: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith("/api/")) apiRequests.push(url.pathname);
      if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
        offsite.push(url.href);
      }
    });
    // A hydration mismatch between the server-seeded widget and the client
    // surfaces as a console error (React #418/#423 in production).
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`${message.text()} <${message.location().url}>`);
      }
    });
    page.on("pageerror", (error) => errors.push(String(error)));
    const events = await recordEvents(page);

    await page.goto("/stays/south-austin", { waitUntil: "networkidle" });
    const widget = page.getByTestId("booking-widget");
    await expect(widget).toHaveAttribute("data-property-id", DAN_JEAN_A);
    await expect(widget.getByRole("grid").first()).toBeVisible();
    await expect(page.getByTestId("booking-footer")).toContainText(
      "Select dates to see price",
    );

    // Today's cell exists (the server decided "today" in Austin time).
    const today = todayInAustin();
    await expect(
      widget.locator(`[role="gridcell"][data-date="${today}"]`),
    ).toHaveCount(1);

    // A weekday ahead carries the direct preview, $124 from the $112 base.
    const stay = pickWeekdayStay(today);
    const cell = widget.locator(
      `[role="gridcell"][data-date="${stay.checkIn}"]`,
    );
    await expect(cell).toHaveAttribute("aria-label", /\$124/);

    expect(apiRequests).toEqual([]);
    expect(offsite).toEqual([]);
    // Vercel's insights script 404s outside Vercel; nothing else may error.
    expect(errors.filter((e) => !e.includes("_vercel/insights"))).toEqual([]);
    expect(events.map((e) => e.type)).toEqual(["widget_loaded"]);
  });

  test("enforces the minimum stay and blocked nights in the calendar", async ({
    page,
  }) => {
    await page.goto("/stays/south-austin");
    const widget = page.getByTestId("booking-widget");
    const today = todayInAustin();

    const reserved = widget.locator(
      `[role="gridcell"][data-date="${nextReservedDay(today)}"]`,
    );
    for (let i = 0; i < 3 && !(await reserved.isVisible()); i++) {
      await widget.getByRole("button", { name: "Next month" }).click();
    }
    await expect(reserved).toHaveAttribute("aria-disabled", "true");
    await expect(reserved).toHaveAttribute("aria-label", /unavailable/);

    const stay = pickWeekdayStay(today);
    await clickDate(widget, stay.checkIn);
    const footer = page.getByTestId("booking-footer");
    await expect(footer).toContainText("Choose a check-out date");
    await expect(
      footer.getByRole("button", { name: "Reserve" }),
    ).toBeDisabled();

    // The next day cannot be the check-out (2-night minimum). It stays
    // clickable only as a fresh check-in: clicking it restarts the stay
    // there rather than completing a one-night one.
    const tooSoon = widget.locator(
      `[role="gridcell"][data-date="${addDays(stay.checkIn, 1)}"]`,
    );
    await expect(tooSoon).toHaveAttribute("aria-label", /minimum 2 nights/);
    await expect(tooSoon).not.toHaveAttribute("aria-selected", "true");
    await tooSoon.click();
    await expect(tooSoon).toHaveAttribute("aria-label", /selected as check-in/);
    await expect(footer).toContainText("Choose a check-out date");
    expect(
      await page
        .getByTestId("booking-widget")
        .locator('[aria-selected="true"]')
        .count(),
    ).toBe(1);
  });

  test("prices the stay, shows the Airbnb saving in the footer, and hands off to Hospitable checkout", async ({
    page,
  }) => {
    const events = await recordEvents(page);
    const checkoutUrls = await interceptCheckout(page);
    const quotePosts: unknown[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/api/quote") && request.method() === "POST") {
        quotePosts.push(request.postDataJSON());
      }
    });

    await page.goto("/stays/south-austin");
    const widget = page.getByTestId("booking-widget");
    const { stay, footer } = await priceStay(page, widget);

    // Breakdown, comparison, and the struck-through footer agree.
    await expect(widget.getByText("$124.32 × 3 nights")).toBeVisible();
    await expect(
      widget.locator("dt", { hasText: "Cleaning fee" }),
    ).toBeVisible();
    const comparison = page.getByTestId("airbnb-comparison");
    await expect(comparison).toContainText("Book direct and save $14.04");
    // The method and the listing link sit behind the disclosure.
    await comparison.getByText("How we estimate this").click();
    await expect(comparison).toContainText("$387.00 for the nights on Airbnb");
    await expect(
      comparison.getByRole("link", { name: "Check the listing on Airbnb" }),
    ).toHaveAttribute("href", /airbnb\.com\/rooms\/1655329029936239948/);
    await expect(page.getByTestId("booking-footer-was")).toContainText(
      "$627.08",
    );
    await expect(page.getByTestId("booking-footer-saved")).toHaveText(
      "$14.04 saved vs booking on Airbnb",
    );
    await expect(footer).toContainText("3 nights");

    // Reserve without details: inline errors, no request, no navigation.
    const reserve = footer.getByRole("button", { name: "Reserve" });
    await expect(reserve).toBeEnabled();
    await reserve.click();
    await expect(page.getByText("Please enter your first name.")).toBeVisible();
    await expect(page.getByLabel("First name")).toBeFocused();
    expect(quotePosts).toHaveLength(1);

    await fillGuest(page, "Guest");
    await reserve.click();
    await page.waitForURL(
      /booking\.hospitable\.com\/book\/external\/2338069\//,
    );

    // The final quote carried the guest's details, normalised; the first did not.
    expect(quotePosts).toHaveLength(2);
    expect(quotePosts[0]).toMatchObject({
      propertyId: DAN_JEAN_A,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: 2,
    });
    expect(quotePosts[0]).not.toHaveProperty("guestDetails");
    expect(quotePosts[1]).toMatchObject({
      guestDetails: {
        firstName: "Test",
        lastName: "Guest",
        email: "test.guest@austincollection.test",
        phone: "+15125550123",
      },
    });
    expect(checkoutUrls).toHaveLength(1);

    // Events, in order, with amounts and never guest details. The click that
    // only surfaced the form errors is not a reserve attempt, so one event.
    expect(events.map((e) => e.type)).toEqual([
      "widget_loaded",
      "dates_selected",
      "quote_shown",
      "comparison_shown",
      "reserve_clicked",
    ]);
    expect(JSON.stringify(events)).not.toContain("austincollection.test");
    expect(events[2]).toMatchObject({
      detail: { total: 61304, currency: "USD", propertyId: DAN_JEAN_A },
    });
    expect(events[3]).toMatchObject({ detail: { savings: 1404 } });
  });

  test("asks for a second click when the total changes at Reserve", async ({
    page,
  }) => {
    const checkoutUrls = await interceptCheckout(page);
    await page.goto("/stays/south-austin");
    const widget = page.getByTestId("booking-widget");
    const { footer } = await priceStay(page, widget);

    await fillGuest(page, "Changed");
    await footer.getByRole("button", { name: "Reserve" }).click();

    await expect(page.getByRole("status")).toContainText(
      "The total changed from $613.04 to $624.74",
    );
    await expect(footer).toContainText("$624.74");
    expect(checkoutUrls).toEqual([]);

    await footer.getByRole("button", { name: "Reserve again" }).click();
    await page.waitForURL(/booking\.hospitable\.com\/book\/external\//);
    expect(checkoutUrls).toHaveLength(1);
  });

  test("clears the stay and refreshes the calendar when the nights were just booked", async ({
    page,
  }) => {
    const checkoutUrls = await interceptCheckout(page);
    const calendarGets: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/calendar/")) {
        calendarGets.push(request.url());
      }
    });
    await page.goto("/stays/south-austin");
    const widget = page.getByTestId("booking-widget");
    const { footer } = await priceStay(page, widget);
    expect(calendarGets).toEqual([]);

    await fillGuest(page, "Unavailable");
    await footer.getByRole("button", { name: "Reserve" }).click();

    // Scoped to the panel: Next's route announcer is also role="alert".
    await expect(page.locator("#book").getByRole("alert")).toContainText(
      "those dates were just booked",
    );
    await expect(footer).toContainText("Select dates to see price");
    await expect
      .poll(() => calendarGets.length, { timeout: 10_000 })
      .toBeGreaterThan(0);
    expect(checkoutUrls).toEqual([]);
  });

  test("a house Hospitable does not list says so instead of breaking", async ({
    page,
  }) => {
    await page.goto("/stays/oak-hill");
    const panel = page.locator("#book");
    await expect(panel.getByRole("alert")).toContainText(
      "This house isn't available to book online.",
    );
    await expect(page.getByTestId("booking-footer")).toHaveCount(0);
    await expect(
      panel.getByRole("link", { name: /view on Airbnb/i }),
    ).toBeVisible();
  });

  test("passes axe with a quote on screen, in both themes", async ({
    page,
  }) => {
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/stays/south-austin");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await priceStay(page, page.getByTestId("booking-widget"));
      const results = await new AxeBuilder({ page }).include("#book").analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(
        blocking.map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        ),
        `axe (${theme})`,
      ).toEqual([]);
    }
  });
});

test.describe("booking routes behind the widget", () => {
  const ip = (testInfo: { parallelIndex: number }, n: number) =>
    `203.0.113.${100 + ((testInfo.parallelIndex * 7 + n) % 100)}`;

  async function postQuote(
    request: APIRequestContext,
    address: string,
    body: unknown,
  ) {
    return request.post("/api/quote", {
      data: body,
      headers: { "x-forwarded-for": address },
    });
  }

  test("/api/properties lists the one house Hospitable lists, with its markups", async ({
    request,
  }) => {
    const response = await request.get("/api/properties");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.comparisonEnabled).toBe(true);
    expect(body.maxNights).toBe(90);
    expect(body.properties).toHaveLength(1);
    expect(body.properties[0]).toMatchObject({
      id: DAN_JEAN_A,
      slug: "south-austin",
      name: "South Austin Stay",
      maxGuests: expect.any(Number),
      markups: { directPct: 11, airbnbPct: 15.5 },
    });
    // No upstream field leaks through: addresses, pictures, summaries.
    expect(body.properties[0]).not.toHaveProperty("address");
    expect(body.properties[0]).not.toHaveProperty("summary");
  });

  test("/api/calendar validates and scopes to our houses", async ({
    request,
  }) => {
    const today = todayInAustin();
    const ok = await request.get(
      `/api/calendar/${DAN_JEAN_A}?start=${today}&end=${addDays(today, 6)}`,
    );
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.start).toBe(today);
    expect(body.days).toHaveLength(7);
    expect(body.days[0]).toMatchObject({
      date: today,
      minStay: 2,
      price: expect.any(Number),
    });

    const bad = await request.get(`/api/calendar/${DAN_JEAN_A}?start=soon`);
    expect(bad.status()).toBe(400);
    expect((await bad.json()).code).toBe("INVALID");

    const unknown = await request.get(
      "/api/calendar/00000000-0000-4000-8000-000000000000",
    );
    expect(unknown.status()).toBe(404);
    expect((await unknown.json()).code).toBe("NOT_FOUND");
  });

  test("/api/quote rejects bad input before asking Hospitable", async ({
    request,
  }, testInfo) => {
    const today = todayInAustin();
    const invalid = await postQuote(request, ip(testInfo, 0), {
      propertyId: DAN_JEAN_A,
      checkIn: today,
      checkOut: today,
      adults: 0,
    });
    expect(invalid.status()).toBe(400);
    const body = await invalid.json();
    expect(body.code).toBe("INVALID");
    expect(body.errors).toMatchObject({
      adults: expect.any(String),
      checkOut: expect.any(String),
    });

    const past = await postQuote(request, ip(testInfo, 1), {
      propertyId: DAN_JEAN_A,
      checkIn: addDays(today, -3),
      checkOut: addDays(today, -1),
      adults: 2,
    });
    expect(past.status()).toBe(400);
    expect((await past.json()).errors.checkIn).toMatch(/past/);

    const long = await postQuote(request, ip(testInfo, 2), {
      propertyId: DAN_JEAN_A,
      checkIn: addDays(today, 1),
      checkOut: addDays(today, 95),
      adults: 2,
    });
    expect(long.status()).toBe(422);
    expect((await long.json()).code).toBe("MAX_NIGHTS");

    const crowd = await postQuote(request, ip(testInfo, 3), {
      propertyId: DAN_JEAN_A,
      checkIn: addDays(today, 1),
      checkOut: addDays(today, 3),
      adults: 16,
    });
    expect(crowd.status()).toBe(422);
    expect((await crowd.json()).code).toBe("MAX_GUESTS");

    const notJson = await request.post("/api/quote", {
      data: "nope",
      headers: {
        "content-type": "text/plain",
        "x-forwarded-for": ip(testInfo, 4),
      },
    });
    expect(notJson.status()).toBe(400);
  });

  test("/api/quote maps Hospitable's refusals and returns the comparison", async ({
    request,
  }, testInfo) => {
    const today = todayInAustin();
    const stay = pickWeekdayStay(today);

    const minStay = await postQuote(request, ip(testInfo, 5), {
      propertyId: DAN_JEAN_A,
      checkIn: stay.checkIn,
      checkOut: addDays(stay.checkIn, 1),
      adults: 2,
    });
    expect(minStay.status()).toBe(422);
    expect((await minStay.json()).code).toBe("MIN_STAY");

    const reserved = nextReservedDay(today);
    const unavailable = await postQuote(request, ip(testInfo, 6), {
      propertyId: DAN_JEAN_A,
      checkIn: addDays(reserved, -1),
      checkOut: addDays(reserved, 1),
      adults: 2,
    });
    expect(unavailable.status()).toBe(409);
    expect((await unavailable.json()).code).toBe("UNAVAILABLE");

    const priced = await postQuote(request, ip(testInfo, 7), {
      propertyId: DAN_JEAN_A,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: 2,
    });
    expect(priced.status()).toBe(200);
    expect(priced.headers()["cache-control"]).toBe("no-store");
    const { quote } = await priced.json();
    expect(quote).toMatchObject({
      nightCount: 3,
      subTotal: 37296,
      cleaningFee: 15100,
      taxes: 8908,
      total: 61304,
      currency: "USD",
      quoteExpiresAt: null,
      comparison: {
        airbnbNightlyTotal: 38700,
        directNightlyTotal: 37296,
        savings: 1404,
      },
    });
    expect(quote.nights).toHaveLength(3);
    expect(quote.nights[0].price).toBe(12432);
    expect(quote.bookingUrl).toMatch(
      /^https:\/\/booking\.hospitable\.com\/book\/external\/2338069\//,
    );
  });

  test("the admin comparison check needs the token and reports the formula's numbers", async ({
    request,
  }) => {
    const date = pickWeekdayStay(todayInAustin()).checkIn;
    const path = `/api/admin/comparison-check?propertyId=${DAN_JEAN_A}&date=${date}`;

    expect((await request.get(path)).status()).toBe(401);
    expect(
      (
        await request.get(path, {
          headers: { authorization: "Bearer not-the-token-0123456789" },
        })
      ).status(),
    ).toBe(401);

    const ok = await request.get(path, {
      headers: { authorization: `Bearer ${E2E_ADMIN_TOKEN}` },
    });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toMatchObject({
      ok: true,
      propertyId: DAN_JEAN_A,
      date,
      available: true,
      airbnbMarkupPct: 15.5,
      directMarkupPct: 11,
      base: 11200,
      airbnbEstimate: 12900,
      directPreview: 12432,
      formatted: { base: "$112.00", airbnbEstimate: "$129.00" },
    });

    const bad = await request.get(
      `/api/admin/comparison-check?propertyId=${DAN_JEAN_A}&date=tuesday`,
      { headers: { authorization: `Bearer ${E2E_ADMIN_TOKEN}` } },
    );
    expect(bad.status()).toBe(400);
  });
});
