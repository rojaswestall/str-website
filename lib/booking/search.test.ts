import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addDays } from "./dates";
import { toDayMap } from "./rules";
import {
  describeUnavailable,
  evaluateStay,
  mergeCalendars,
  parseSearchParams,
  type SearchQuery,
  searchQueryString,
} from "./search";
import type { CalendarDay } from "./types";

const TODAY = "2027-03-01";
const LIMITS = { today: TODAY, maxNights: 30 };

function day(date: string, overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    date,
    available: true,
    price: 10000,
    minStay: 1,
    closedToArrival: false,
    closedToDeparture: false,
    ...overrides,
  };
}

/** `count` days from TODAY, with per-date overrides. */
function calendar(
  count: number,
  overrides: Record<string, Partial<CalendarDay>> = {},
): CalendarDay[] {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(TODAY, i);
    return day(date, overrides[date]);
  });
}

const HOUSE = {
  maxGuests: 8,
  petsAllowed: false,
  markups: { directPct: 10, airbnbPct: 15 },
};

function query(checkIn: string, checkOut: string, guests = {}): SearchQuery {
  return {
    checkIn,
    checkOut,
    guests: { adults: 2, children: 0, infants: 0, pets: 0, ...guests },
  };
}

describe("parseSearchParams", () => {
  it("is empty without dates", () => {
    assert.deepEqual(parseSearchParams({}, LIMITS), { status: "empty" });
  });

  it("reads a stay with defaults for missing counts", () => {
    const parsed = parseSearchParams(
      { checkin: "2027-03-05", checkout: "2027-03-08" },
      LIMITS,
    );
    assert.deepEqual(parsed, {
      status: "ok",
      query: query("2027-03-05", "2027-03-08"),
    });
  });

  it("clamps counts and takes the first of repeated parameters", () => {
    const parsed = parseSearchParams(
      {
        checkin: ["2027-03-05", "2027-04-01"],
        checkout: "2027-03-08",
        adults: "0",
        children: "40",
        infants: "x",
        pets: "9",
      },
      LIMITS,
    );
    assert.equal(parsed.status, "ok");
    if (parsed.status !== "ok") return;
    assert.equal(parsed.query.checkIn, "2027-03-05");
    assert.deepEqual(parsed.query.guests, {
      adults: 1,
      children: 15,
      infants: 0,
      pets: 2,
    });
  });

  it("rejects malformed, past, backwards and over-long stays", () => {
    const cases = [
      { checkin: "2027-3-5", checkout: "2027-03-08" },
      { checkin: "2027-02-27", checkout: "2027-03-02" },
      { checkin: "2027-03-08", checkout: "2027-03-08" },
      { checkin: "2027-03-05", checkout: "2027-05-05" },
      { checkin: "2027-03-05" },
    ];
    for (const params of cases) {
      assert.equal(
        parseSearchParams(params, LIMITS).status,
        "invalid",
        JSON.stringify(params),
      );
    }
  });

  it("round-trips through searchQueryString", () => {
    const q = query("2027-03-05", "2027-03-08", { children: 1, pets: 1 });
    const params = Object.fromEntries(
      new URLSearchParams(searchQueryString(q)),
    );
    assert.deepEqual(parseSearchParams(params, LIMITS), {
      status: "ok",
      query: q,
    });
  });
});

describe("evaluateStay", () => {
  it("offers a free stay with its preview total", () => {
    const verdict = evaluateStay(
      HOUSE,
      toDayMap(calendar(20)),
      query("2027-03-05", "2027-03-08"),
      LIMITS,
    );
    // $100 base + 10% direct markup, three nights.
    assert.deepEqual(verdict, {
      available: true,
      nights: 3,
      totalDollars: 330,
    });
  });

  it("reports a booked night inside the stay", () => {
    const days = toDayMap(calendar(20, { "2027-03-06": { available: false } }));
    const verdict = evaluateStay(
      HOUSE,
      days,
      query("2027-03-05", "2027-03-08"),
      LIMITS,
    );
    assert.deepEqual(verdict, { available: false, reason: "booked" });
  });

  it("reports a booked check-in night as booked, a closed arrival as no-arrival", () => {
    const booked = toDayMap(
      calendar(20, { "2027-03-05": { available: false } }),
    );
    assert.deepEqual(
      evaluateStay(HOUSE, booked, query("2027-03-05", "2027-03-08"), LIMITS),
      { available: false, reason: "booked" },
    );
    const closed = toDayMap(
      calendar(20, { "2027-03-05": { closedToArrival: true } }),
    );
    assert.deepEqual(
      evaluateStay(HOUSE, closed, query("2027-03-05", "2027-03-08"), LIMITS),
      { available: false, reason: "no-arrival" },
    );
  });

  it("reports the minimum stay, a closed departure and the stay cap", () => {
    const min = toDayMap(calendar(40, { "2027-03-05": { minStay: 4 } }));
    assert.deepEqual(
      evaluateStay(HOUSE, min, query("2027-03-05", "2027-03-08"), LIMITS),
      { available: false, reason: "min-stay", minStay: 4 },
    );
    const out = toDayMap(
      calendar(20, { "2027-03-08": { closedToDeparture: true } }),
    );
    assert.deepEqual(
      evaluateStay(HOUSE, out, query("2027-03-05", "2027-03-08"), LIMITS),
      { available: false, reason: "no-departure" },
    );
    assert.deepEqual(
      evaluateStay(
        HOUSE,
        toDayMap(calendar(40)),
        query("2027-03-02", "2027-03-30"),
        {
          ...LIMITS,
          maxNights: 14,
        },
      ),
      { available: false, reason: "max-nights" },
    );
  });

  it("checks guests and pets before dates", () => {
    const days = toDayMap(calendar(20, { "2027-03-06": { available: false } }));
    assert.deepEqual(
      evaluateStay(
        HOUSE,
        days,
        query("2027-03-05", "2027-03-08", { adults: 6, children: 3 }),
        LIMITS,
      ),
      { available: false, reason: "too-many-guests" },
    );
    assert.deepEqual(
      evaluateStay(
        HOUSE,
        days,
        query("2027-03-05", "2027-03-08", { pets: 1 }),
        LIMITS,
      ),
      { available: false, reason: "no-pets" },
    );
  });

  it("counts infants toward neither capacity nor pets", () => {
    const verdict = evaluateStay(
      HOUSE,
      toDayMap(calendar(20)),
      query("2027-03-05", "2027-03-07", { adults: 8, infants: 3 }),
      LIMITS,
    );
    assert.equal(verdict.available, true);
  });

  it("is unknown past the end of the calendar", () => {
    const verdict = evaluateStay(
      HOUSE,
      toDayMap(calendar(5)),
      query("2027-03-10", "2027-03-12"),
      LIMITS,
    );
    assert.deepEqual(verdict, { available: false, reason: "unknown" });
  });

  it("describes every reason in a sentence", () => {
    for (const reason of [
      "booked",
      "min-stay",
      "no-arrival",
      "no-departure",
      "max-nights",
      "too-many-guests",
      "no-pets",
      "unknown",
    ] as const) {
      assert.match(
        describeUnavailable({ available: false, reason, minStay: 3 }),
        /\.$/,
      );
    }
  });
});

describe("mergeCalendars", () => {
  it("opens a night when any house is open, at the lowest marked-up price", () => {
    const merged = mergeCalendars([
      {
        days: [
          day("2027-03-05", { available: false }),
          day("2027-03-06", { price: 20000 }),
        ],
        directPct: 10,
      },
      {
        days: [
          day("2027-03-05", { price: 15000 }),
          day("2027-03-06", { price: 19000 }),
        ],
        directPct: 20,
      },
    ]);
    assert.deepEqual(merged, [
      day("2027-03-05", { price: 18000 }),
      day("2027-03-06", { price: 22000 }),
    ]);
  });

  it("keeps a night closed only when every house is closed", () => {
    const merged = mergeCalendars([
      {
        days: [day("2027-03-05", { available: false, price: 9000 })],
        directPct: 10,
      },
      {
        days: [day("2027-03-05", { available: false, price: 8000 })],
        directPct: 10,
      },
    ]);
    assert.equal(merged[0]!.available, false);
  });

  it("allows arrival or departure when any open house does, with the shortest minimum", () => {
    const merged = mergeCalendars([
      {
        days: [day("2027-03-05", { closedToArrival: true, minStay: 3 })],
        directPct: 0,
      },
      {
        days: [day("2027-03-05", { closedToDeparture: true, minStay: 2 })],
        directPct: 0,
      },
      {
        days: [day("2027-03-05", { available: false, minStay: 1 })],
        directPct: 0,
      },
    ]);
    assert.deepEqual(merged[0], day("2027-03-05", { minStay: 2 }));
  });

  it("returns dates in order across houses with different windows", () => {
    const merged = mergeCalendars([
      { days: [day("2027-03-07")], directPct: 0 },
      { days: [day("2027-03-05"), day("2027-03-06")], directPct: 0 },
    ]);
    assert.deepEqual(
      merged.map((d) => d.date),
      ["2027-03-05", "2027-03-06", "2027-03-07"],
    );
  });
});
