import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addDays } from "./dates";
import {
  evaluateStay,
  freeFirst,
  guestSummary,
  houseHref,
  nothingKnown,
  openDays,
  parsePrefill,
  parseSearchPage,
  parseSearchQuery,
  refusalText,
  resultsHeadline,
  searchHref,
  searchQueryString,
  stayLabel,
} from "./search";
import type { CalendarDay, SearchQuery, StayEvaluation } from "./types";

/*
 * A synthetic 60-day calendar from 2027-03-01 (a Monday): $112.00 base on
 * weekdays, $150.00 on Fridays and Saturdays, a 2-night minimum, the
 * 10th–12th reserved, the 20th closed to arrival, the 25th closed to
 * departure. Same shape as the e2e stand-in, so a number checked here is
 * the number the route returns there.
 */
const TODAY = "2027-03-01";
const limits = { today: TODAY, maxNights: 90 };

function day(date: string, patch: Partial<CalendarDay> = {}): CalendarDay {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const dom = Number(date.slice(8, 10));
  return {
    date,
    available: !(dom >= 10 && dom <= 12),
    price: weekday === 5 || weekday === 6 ? 15000 : 11200,
    minStay: 2,
    closedToArrival: dom === 20,
    closedToDeparture: dom === 25,
    ...patch,
  };
}

const days: CalendarDay[] = Array.from({ length: 60 }, (_, i) =>
  day(addDays(TODAY, i)),
);

const house = {
  maxGuests: 8,
  petsAllowed: true,
  markups: { directPct: 11, airbnbPct: 15.5 },
};
const small = { ...house, maxGuests: 4, petsAllowed: false };

function stay(
  checkIn: string,
  checkOut: string,
  guests: Partial<SearchQuery> = {},
): SearchQuery {
  return {
    checkIn,
    checkOut,
    adults: 2,
    children: 0,
    infants: 0,
    pets: 0,
    ...guests,
  };
}

describe("evaluateStay", () => {
  it("prices a free stay at the calendar's direct preview, nights only", () => {
    // Mon 1 → Thu 4: three weekday nights at round($112 × 1.11) = $124.
    assert.deepEqual(
      evaluateStay(house, days, stay("2027-03-01", "2027-03-04"), limits),
      {
        available: true,
        nights: 3,
        nightly: { min: 12400, max: 12400 },
        estimatedNightlyTotal: 37200,
      },
    );
    // Thu 4 → Sun 7 crosses Friday and Saturday at round($150 × 1.11) = $167.
    assert.deepEqual(
      evaluateStay(house, days, stay("2027-03-04", "2027-03-07"), limits),
      {
        available: true,
        nights: 3,
        nightly: { min: 12400, max: 16700 },
        estimatedNightlyTotal: 12400 + 16700 + 16700,
      },
    );
  });

  it("applies each house's own markup", () => {
    const marked = { ...house, markups: { directPct: 0, airbnbPct: 0 } };
    const result = evaluateStay(
      marked,
      days,
      stay("2027-03-01", "2027-03-03"),
      limits,
    );
    assert.equal(result.available && result.estimatedNightlyTotal, 22400);
  });

  it("refuses a stay that crosses a reserved night", () => {
    assert.deepEqual(
      evaluateStay(house, days, stay("2027-03-09", "2027-03-13"), limits),
      {
        available: false,
        reason: "unavailable",
        nights: 4,
      },
    );
    // Checking in on a reserved night is the same answer.
    assert.equal(
      evaluateStay(house, days, stay("2027-03-10", "2027-03-14"), limits)
        .available,
      false,
    );
  });

  it("allows checking out on the morning a reservation begins", () => {
    assert.equal(
      evaluateStay(house, days, stay("2027-03-08", "2027-03-10"), limits)
        .available,
      true,
    );
  });

  it("reports the check-in day's minimum stay", () => {
    assert.deepEqual(
      evaluateStay(house, days, stay("2027-03-01", "2027-03-02"), limits),
      {
        available: false,
        reason: "min-stay",
        nights: 1,
        minStay: 2,
      },
    );
  });

  it("caps the stay at the configured maximum", () => {
    const short = { today: TODAY, maxNights: 3 };
    assert.deepEqual(
      evaluateStay(house, days, stay("2027-03-01", "2027-03-05"), short),
      {
        available: false,
        reason: "max-nights",
        nights: 4,
      },
    );
  });

  it("respects closed-to-arrival and closed-to-departure", () => {
    assert.deepEqual(
      evaluateStay(house, days, stay("2027-03-20", "2027-03-22"), limits),
      {
        available: false,
        reason: "closed-to-arrival",
        nights: 2,
      },
    );
    assert.deepEqual(
      evaluateStay(house, days, stay("2027-03-22", "2027-03-25"), limits),
      {
        available: false,
        reason: "closed-to-departure",
        nights: 3,
      },
    );
  });

  it("checks capacity against adults plus children, not infants", () => {
    assert.deepEqual(
      evaluateStay(
        small,
        days,
        stay("2027-03-01", "2027-03-04", { adults: 3, children: 2 }),
        limits,
      ),
      { available: false, reason: "max-guests", nights: 3 },
    );
    assert.equal(
      evaluateStay(
        small,
        days,
        stay("2027-03-01", "2027-03-04", {
          adults: 2,
          children: 2,
          infants: 3,
        }),
        limits,
      ).available,
      true,
    );
  });

  it("refuses pets where they are not allowed", () => {
    assert.deepEqual(
      evaluateStay(
        small,
        days,
        stay("2027-03-01", "2027-03-04", { pets: 1 }),
        limits,
      ),
      { available: false, reason: "pets", nights: 3 },
    );
    assert.equal(
      evaluateStay(
        house,
        days,
        stay("2027-03-01", "2027-03-04", { pets: 1 }),
        limits,
      ).available,
      true,
    );
  });

  it("reports a permanent limit before a calendar clash", () => {
    const result = evaluateStay(
      small,
      days,
      stay("2027-03-09", "2027-03-13", { adults: 6 }),
      limits,
    );
    assert.equal(!result.available && result.reason, "max-guests");
  });

  it("refuses a check-in before today, and nights outside the window", () => {
    assert.deepEqual(
      evaluateStay(house, days, stay("2027-02-27", "2027-03-02"), limits),
      { available: false, reason: "past", nights: 3 },
    );
    assert.deepEqual(
      evaluateStay(house, days, stay("2027-04-28", "2027-05-02"), limits),
      { available: false, reason: "unavailable", nights: 4 },
    );
  });
});

describe("parseSearchQuery", () => {
  it("reads the URL contract and defaults the guests", () => {
    const params = new URLSearchParams(
      "checkin=2027-03-05&checkout=2027-03-08",
    );
    assert.deepEqual(parseSearchQuery(params, limits), {
      ok: true,
      query: {
        checkIn: "2027-03-05",
        checkOut: "2027-03-08",
        adults: 2,
        children: 0,
        infants: 0,
        pets: 0,
      },
    });
  });

  it("accepts Next's searchParams shape, first value wins", () => {
    const result = parseSearchQuery(
      {
        checkin: "2027-03-05",
        checkout: ["2027-03-08", "2027-03-09"],
        adults: "3",
        children: "1",
        infants: "1",
        pets: "2",
        utm_source: "newsletter",
      },
      limits,
    );
    assert.deepEqual(result, {
      ok: true,
      query: {
        checkIn: "2027-03-05",
        checkOut: "2027-03-08",
        adults: 3,
        children: 1,
        infants: 1,
        pets: 2,
      },
    });
  });

  it("names every bad field by its parameter", () => {
    const result = parseSearchQuery(
      new URLSearchParams("checkin=soon&adults=0&children=x&infants=9&pets=3"),
      limits,
    );
    assert.equal(result.ok, false);
    assert.deepEqual(Object.keys(!result.ok ? result.errors : {}).sort(), [
      "adults",
      "checkin",
      "checkout",
      "children",
      "infants",
      "pets",
    ]);
    assert.match((!result.ok && result.errors.checkin) || "", /2027-03-12/);
    assert.match((!result.ok && result.errors.checkout) || "", /check-out/i);
  });

  it("rejects the past, a check-out not after check-in, and too many nights", () => {
    const past = parseSearchQuery(
      new URLSearchParams("checkin=2027-02-27&checkout=2027-03-02"),
      limits,
    );
    assert.deepEqual(past, {
      ok: false,
      errors: { checkin: "Check-in can't be in the past." },
    });

    const same = parseSearchQuery(
      new URLSearchParams("checkin=2027-03-05&checkout=2027-03-05"),
      limits,
    );
    assert.deepEqual(same, {
      ok: false,
      errors: { checkout: "Checkout must be after check-in." },
    });

    const long = parseSearchQuery(
      new URLSearchParams("checkin=2027-03-05&checkout=2027-03-10"),
      { today: TODAY, maxNights: 4 },
    );
    assert.equal(long.ok, false);
    assert.match((!long.ok && long.errors.checkout) || "", /4 nights/);
  });
});

describe("parsePrefill", () => {
  it("keeps what is valid and ignores the rest", () => {
    assert.deepEqual(
      parsePrefill(
        new URLSearchParams(
          "checkin=2027-03-05&checkout=2027-03-08&adults=3&pets=1",
        ),
        limits,
      ),
      {
        selection: { checkIn: "2027-03-05", checkOut: "2027-03-08" },
        guests: { adults: 3, children: 0, infants: 0, pets: 1 },
      },
    );
    assert.deepEqual(
      parsePrefill(
        {
          checkin: "2027-03-05",
          checkout: "bad",
          adults: "lots",
          children: "99",
        },
        limits,
      ),
      {
        selection: { checkIn: "2027-03-05", checkOut: null },
        guests: { adults: 2, children: 0, infants: 0, pets: 0 },
      },
    );
  });

  it("drops a check-out that is not after the check-in or is too far", () => {
    assert.deepEqual(
      parsePrefill({ checkin: "2027-03-05", checkout: "2027-03-05" }, limits)
        .selection,
      { checkIn: "2027-03-05", checkOut: null },
    );
    assert.deepEqual(
      parsePrefill(
        { checkin: "2027-03-05", checkout: "2027-03-10" },
        { today: TODAY, maxNights: 4 },
      ).selection,
      { checkIn: "2027-03-05", checkOut: null },
    );
  });

  it("drops both dates when the check-in is bad or past", () => {
    assert.deepEqual(
      parsePrefill({ checkin: "2027-02-27", checkout: "2027-03-08" }, limits)
        .selection,
      { checkIn: null, checkOut: null },
    );
    assert.deepEqual(parsePrefill({}, limits), {
      selection: { checkIn: null, checkOut: null },
      guests: { adults: 2, children: 0, infants: 0, pets: 0 },
    });
  });
});

describe("guestSummary", () => {
  it("names each kind of guest that is present, adults first", () => {
    assert.equal(
      guestSummary({ adults: 2, children: 0, infants: 0, pets: 0 }),
      "2 adults",
    );
    assert.equal(
      guestSummary({ adults: 1, children: 1, infants: 0, pets: 0 }),
      "1 adult, 1 child",
    );
    assert.equal(
      guestSummary({ adults: 2, children: 3, infants: 1, pets: 2 }),
      "2 adults, 3 children, 1 infant, 2 pets",
    );
  });
});

describe("searchHref", () => {
  it("writes every parameter of the URL contract, in field order", () => {
    const query = stay("2027-03-05", "2027-03-08", { adults: 3 });
    assert.equal(
      searchQueryString(query),
      "checkin=2027-03-05&checkout=2027-03-08&adults=3&children=0&infants=0&pets=0",
    );
    assert.equal(
      searchHref(query),
      "/search?checkin=2027-03-05&checkout=2027-03-08&adults=3&children=0&infants=0&pets=0",
    );
  });

  it("round-trips through the strict parser", () => {
    const query = stay("2027-03-05", "2027-03-08", { children: 2, pets: 1 });
    const parsed = parseSearchQuery(
      new URLSearchParams(searchQueryString(query)),
      limits,
    );
    assert.deepEqual(parsed, { ok: true, query });
  });
});

describe("openDays", () => {
  it("is every day from today through the end, free and unpriced", () => {
    const open = openDays("2027-03-30", "2027-04-02");
    assert.deepEqual(
      open.map((d) => d.date),
      ["2027-03-30", "2027-03-31", "2027-04-01", "2027-04-02"],
    );
    for (const d of open) {
      assert.deepEqual(d, {
        date: d.date,
        available: true,
        price: 0,
        minStay: 1,
        closedToArrival: false,
        closedToDeparture: false,
      });
    }
    assert.deepEqual(openDays("2027-03-30", "2027-03-29"), []);
  });
});

describe("parseSearchPage", () => {
  it("has a stay to search only when both dates survive", () => {
    const whole = parseSearchPage(
      { checkin: "2027-03-05", checkout: "2027-03-08", adults: "3" },
      limits,
    );
    assert.deepEqual(
      whole.query,
      stay("2027-03-05", "2027-03-08", { adults: 3 }),
    );
    assert.equal(whole.tooLong, false);
    assert.deepEqual(whole.selection, {
      checkIn: "2027-03-05",
      checkOut: "2027-03-08",
    });

    // Nothing, a bad date, the past, a check-out not after the check-in:
    // all "no dates", with whatever is valid kept for the bar.
    for (const params of [
      {},
      { checkin: "bad" },
      { checkin: "2027-02-20", checkout: "2027-03-05" },
      { checkin: "2027-03-08", checkout: "2027-03-05" },
      { checkin: "2027-03-05", checkout: "2027-03-05" },
      { checkin: "2027-03-05" },
    ]) {
      const page = parseSearchPage(params, limits);
      assert.equal(page.query, null, JSON.stringify(params));
      assert.equal(page.tooLong, false, JSON.stringify(params));
    }
    assert.deepEqual(
      parseSearchPage({ checkin: "2027-03-08", checkout: "2027-03-05" }, limits)
        .selection,
      { checkIn: "2027-03-08", checkOut: null },
    );
  });

  it("is lenient about guests where the route is strict", () => {
    const page = parseSearchPage(
      {
        checkin: "2027-03-05",
        checkout: "2027-03-08",
        adults: "99",
        pets: "x",
      },
      limits,
    );
    assert.deepEqual(page.query, stay("2027-03-05", "2027-03-08"));
  });

  it("flags a stay longer than the maximum, and only that", () => {
    const long = parseSearchPage(
      { checkin: "2027-03-05", checkout: addDays("2027-03-05", 91) },
      limits,
    );
    assert.equal(long.query, null);
    assert.equal(long.tooLong, true);
    assert.deepEqual(long.selection, { checkIn: "2027-03-05", checkOut: null });

    const longest = parseSearchPage(
      { checkin: "2027-03-05", checkout: addDays("2027-03-05", 90) },
      limits,
    );
    assert.equal(longest.tooLong, false);
    assert.equal(longest.query?.checkOut, addDays("2027-03-05", 90));

    // A past check-in is dropped first: there is no stay to call too long.
    const past = parseSearchPage(
      { checkin: "2027-02-01", checkout: "2027-12-01" },
      limits,
    );
    assert.equal(past.tooLong, false);
  });
});

describe("the results page", () => {
  const free: StayEvaluation = {
    available: true,
    nights: 3,
    nightly: { min: 12400, max: 12400 },
    estimatedNightlyTotal: 37200,
  };
  const refused = (
    reason: Extract<StayEvaluation, { available: false }>["reason"],
    minStay?: number,
  ): Extract<StayEvaluation, { available: false }> => ({
    available: false,
    reason,
    nights: 3,
    ...(minStay ? { minStay } : {}),
  });
  const guests = { adults: 3, children: 1, infants: 0, pets: 0 };

  it("links a free house with the whole stay and any other with the guests only", () => {
    assert.equal(
      houseHref("south-austin", guests, {
        checkIn: "2027-03-12",
        checkOut: "2027-03-15",
      }),
      "/stays/south-austin?checkin=2027-03-12&checkout=2027-03-15&adults=3&children=1&infants=0&pets=0",
    );
    assert.equal(
      houseHref("oak-hill", guests),
      "/stays/oak-hill?adults=3&children=1&infants=0&pets=0",
    );
    // What the link carries is what the house page reads back.
    const href = houseHref("south-austin", guests, {
      checkIn: "2027-03-12",
      checkOut: "2027-03-15",
    });
    assert.deepEqual(
      parsePrefill(new URLSearchParams(href.split("?")[1]), limits),
      {
        selection: { checkIn: "2027-03-12", checkOut: "2027-03-15" },
        guests,
      },
    );
  });

  it("puts the free houses first and keeps content order within each group", () => {
    const results = [
      { slug: "a", stay: refused("min-stay", 3) },
      { slug: "b", stay: free },
      { slug: "c", stay: refused("pets") },
      { slug: "d", stay: free },
    ];
    assert.deepEqual(
      freeFirst(results).map((r) => r.slug),
      ["b", "d", "a", "c"],
    );
    assert.equal(results[0]!.slug, "a", "the input is not reordered");
  });

  it("knows nothing only when every calendar failed", () => {
    assert.equal(
      nothingKnown([
        { stay: refused("unknown") },
        { stay: refused("unknown") },
      ]),
      true,
    );
    assert.equal(
      nothingKnown([{ stay: refused("unknown") }, { stay: refused("pets") }]),
      false,
    );
    assert.equal(
      nothingKnown([{ stay: refused("unknown") }, { stay: free }]),
      false,
    );
  });

  it("writes the stay and the headline", () => {
    // 12 March 2027 is a Friday.
    assert.equal(
      stayLabel("2027-03-12", "2027-03-15"),
      "Fri, Mar 12 → Mon, Mar 15 · 3 nights",
    );
    assert.equal(
      stayLabel("2027-03-12", "2027-03-13"),
      "Fri, Mar 12 → Sat, Mar 13 · 1 night",
    );
    const headline = (stays: StayEvaluation[]) =>
      resultsHeadline(
        stays.map((s) => ({ stay: s })),
        "2027-03-12",
        "2027-03-15",
      );
    const dates = "Fri, Mar 12 → Mon, Mar 15 · 3 nights";
    assert.equal(
      headline([free, refused("unavailable"), free]),
      `2 of 3 houses are free for ${dates}`,
    );
    assert.equal(
      headline([refused("pets"), refused("unavailable"), free]),
      `1 of 3 houses is free for ${dates}`,
    );
    assert.equal(
      headline([free, free, free]),
      `All 3 houses are free for ${dates}`,
    );
    assert.equal(
      headline([refused("pets"), refused("unknown")]),
      `No house is free for ${dates}`,
    );
    assert.equal(headline([free]), `The house is free for ${dates}`);
  });

  it("says why a house is not free in one plain line", () => {
    const house = { maxGuests: 4 };
    assert.equal(
      refusalText(refused("unavailable"), house),
      "Booked for some of those nights",
    );
    assert.equal(
      refusalText(refused("min-stay", 3), house),
      "Needs a 3-night minimum on those dates",
    );
    assert.equal(
      refusalText(refused("min-stay"), house),
      "Needs a longer stay on those dates",
    );
    assert.equal(refusalText(refused("max-guests"), house), "Sleeps up to 4");
    assert.equal(refusalText(refused("pets"), house), "No pets at this house");
    assert.equal(
      refusalText(refused("past"), house),
      "Those dates are in the past",
    );
    assert.equal(
      refusalText(refused("unknown"), house),
      "Couldn't check this house just now",
    );
    for (const reason of [
      "max-nights",
      "closed-to-arrival",
      "closed-to-departure",
    ] as const) {
      assert.match(refusalText(refused(reason), house), /\S/);
    }
  });
});
