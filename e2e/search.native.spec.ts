import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

/*
 * The "check dates" search, in the "chromium-native" project: the third
 * build, pointed at the stand-in Hospitable API (e2e/mock-hospitable), which
 * lists one house, Dan Jean Unit A (South Austin Stay). Its generated
 * calendar: weekdays $112.00 base ($124 direct preview), the 10th–12th
 * reserved, the 20th closed to check-in, a 2-night minimum.
 */

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
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const dom = (iso: string) => Number(iso.slice(8, 10));
const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** Monday → Thursday, clear of the reserved and closed days. */
function weekdayStay(): { checkIn: string; checkOut: string } {
  let date = addDays(todayInAustin(), 2);
  for (let i = 0; i < 60; i++, date = addDays(date, 1)) {
    if (weekday(date) !== 1 || dom(date) === 20) continue;
    const span = [0, 1, 2, 3].map((n) => dom(addDays(date, n)));
    if (span.every((d) => d < 10 || d > 12)) {
      return { checkIn: date, checkOut: addDays(date, 3) };
    }
  }
  throw new Error("no clear weekday stay found");
}

/** A two-night stay starting on the next 11th, which is reserved. */
function reservedStay(): { checkIn: string; checkOut: string } {
  let date = addDays(todayInAustin(), 1);
  while (dom(date) !== 11) date = addDays(date, 1);
  return { checkIn: date, checkOut: addDays(date, 2) };
}

function query(stay: { checkIn: string; checkOut: string }, adults = 2) {
  return `checkin=${stay.checkIn}&checkout=${stay.checkOut}&adults=${adults}&children=0&infants=0&pets=0`;
}

async function pickDate(panel: Locator, date: string) {
  await expect(panel.locator('[role="gridcell"]').first()).toBeVisible();
  const cell = panel.locator(`[role="gridcell"][data-date="${date}"]`);
  for (let i = 0; i < 4 && !(await cell.isVisible()); i++) {
    await panel.getByRole("button", { name: "Next month" }).click();
  }
  await cell.click();
}

async function expectNoSeriousViolations(page: Page, include: string) {
  const results = await new AxeBuilder({ page }).include(include).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
  ).toEqual([]);
}

test.describe("check dates search (native)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*.apple-mapkit.com/**", (route) => route.abort());
  });

  test("the merged calendar route answers with the house's nights", async ({
    request,
  }) => {
    const response = await request.get("/api/search/calendar");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.start).toBe(todayInAustin());
    const stay = weekdayStay();
    const night = body.days.find(
      (d: { date: string }) => d.date === stay.checkIn,
    );
    // $112.00 base with the 11% direct markup, in cents.
    expect(night).toMatchObject({ available: true, price: 12432 });
  });

  test("hero form: keyboard opens and closes the panels, and a search lands on focused results", async ({
    page,
  }) => {
    await page.goto("/");
    const form = page.getByRole("search", {
      name: "Check dates across all three",
    });
    const dates = form.getByRole("button", { name: /Dates/ });
    const guests = form.getByRole("button", { name: /Guests/ });

    // Enter opens the calendar and moves focus onto a day; Escape returns it.
    await dates.focus();
    await page.keyboard.press("Enter");
    await expect(dates).toHaveAttribute("aria-expanded", "true");
    const panel = form.getByRole("group", { name: "Choose your dates" });
    await expect(panel.locator('[role="gridcell"]:focus')).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dates).toHaveAttribute("aria-expanded", "false");
    await expect(dates).toBeFocused();

    // Searching without dates explains what is missing and opens the calendar.
    await form.getByRole("button", { name: "Search" }).click();
    await expect(form.getByRole("alert")).toHaveText(
      "Choose your check-in and checkout dates first.",
    );
    await expect(dates).toHaveAttribute("aria-expanded", "true");

    const stay = weekdayStay();
    await pickDate(panel, stay.checkIn);
    await pickDate(panel, stay.checkOut);
    await expect(panel).toBeHidden();
    await expect(guests).toBeFocused();
    await expect(dates).toContainText("3 nights");

    await guests.click();
    const guestsPanel = form.getByRole("group", { name: "Guests" });
    await guestsPanel
      .getByRole("button", { name: "Add one of children" })
      .click();
    await expect(guests).toContainText("3 guests");
    await page.keyboard.press("Escape");
    await expect(guests).toBeFocused();

    await form.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(
      new RegExp(
        `/search\\?checkin=${stay.checkIn}&checkout=${stay.checkOut}&adults=2&children=1`,
      ),
    );
    const heading = page.getByRole("heading", {
      level: 2,
      name: /1 of 1 house is free/,
    });
    await expect(heading).toBeFocused();
    await expect(heading).toContainText("3 guests");
  });

  test("results: the free house links to its page with the stay, which the widget opens on", async ({
    page,
  }) => {
    const stay = weekdayStay();
    await page.goto(`/search?${query(stay)}`);

    const card = page.getByRole("listitem").filter({
      has: page.getByRole("heading", { level: 3, name: "South Austin Stay" }),
    });
    await expect(card).toContainText(
      "Fast WiFi |Garage| Yard | 3BR • 5 Beds • Sleeps 8+",
    );
    // 3 × $124 preview nights.
    await expect(card).toContainText("About $372 for 3 nights");
    const book = card.getByRole("link", {
      name: "Book these dates at South Austin Stay",
    });
    await expect(book).toHaveAttribute(
      "href",
      `/stays/south-austin?${query(stay)}#book`,
    );

    // The form starts from the stay in the URL.
    await expect(
      page.getByTestId("check-dates").getByRole("button", { name: /Dates/ }),
    ).toContainText("3 nights");

    await book.click();
    await expect(page).toHaveURL(/\/stays\/south-austin\?/);
    const footer = page.getByTestId("booking-footer");
    await expect(footer).toContainText("$613.04", { timeout: 15_000 });
    await expect(
      page.locator(`[role="gridcell"][data-date="${stay.checkIn}"]`),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("results: a booked stay and too many guests say why", async ({
    page,
  }) => {
    await page.goto(`/search?${query(reservedStay())}`);
    await expect(
      page.getByRole("heading", { level: 2, name: /No house is free/ }),
    ).toBeVisible();
    await expect(
      page.getByText("Already booked for some of those nights."),
    ).toBeVisible();

    await page.goto(`/search?${query(weekdayStay(), 14)}`);
    await expect(
      page.getByText("Doesn't sleep that many guests."),
    ).toBeVisible();
  });

  test("a stay that cannot be read is explained, not crashed on", async ({
    page,
  }) => {
    await page.goto("/search?checkin=2020-01-01&checkout=2020-01-03");
    await expect(
      page.getByText("Check-in can't be in the past."),
    ).toBeVisible();
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`no serious axe violations on the form and results (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`/search?${query(weekdayStay())}`);
      await expect(
        page.getByRole("heading", { level: 2, name: /free/ }),
      ).toBeVisible();
      await page
        .getByTestId("check-dates")
        .getByRole("button", { name: /Dates/ })
        .click();
      await expect(
        page
          .getByRole("group", { name: "Choose your dates" })
          .locator('[role="gridcell"]')
          .first(),
      ).toBeVisible();
      await expectNoSeriousViolations(page, "main");
    });
  }
});
