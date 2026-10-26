import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  airbnbNightlyCents,
  airbnbStayCents,
  compareWithAirbnb,
} from "./comparison";
import { normalizeCalendar, normalizeQuote } from "./normalize";

function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      new URL(`./__fixtures__/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
}

const danJeanA = normalizeCalendar(fixture("calendar-danjean-a"));
const AIRBNB_URL = "https://www.airbnb.com/rooms/1655329029936239948";

describe("airbnbNightlyCents", () => {
  it("floors the marked-up rate to whole dollars, as Airbnb displays it", () => {
    // The three dates checked against the real Airbnb host calendar.
    assert.equal(airbnbNightlyCents(11200, 15.5), 12900); // $129.36 → $129
    assert.equal(airbnbNightlyCents(22300, 15.5), 25700); // $257.57 → $257
    assert.equal(airbnbNightlyCents(20300, 15.5), 23400); // $234.47 → $234
    assert.equal(airbnbNightlyCents(13000, 0), 13000);
  });
});

describe("airbnbStayCents", () => {
  it("sums the nights of a stay", () => {
    assert.equal(
      airbnbStayCents(danJeanA, "2026-11-02", "2026-11-04", 15.5),
      25800,
    );
  });

  it("is null for a missing night or an empty stay", () => {
    assert.equal(
      airbnbStayCents(danJeanA, "2028-01-01", "2028-01-03", 15.5),
      null,
    );
    assert.equal(
      airbnbStayCents(danJeanA, "2026-11-02", "2026-11-02", 15.5),
      null,
    );
  });
});

describe("compareWithAirbnb", () => {
  const stay = {
    enabled: true,
    days: danJeanA,
    checkIn: "2026-11-02",
    checkOut: "2026-11-04",
    airbnbMarkupPct: 15.5,
    directNightlyTotal: 24864, // the real quote's sub_total at 11%
    airbnbUrl: AIRBNB_URL,
  };

  it("reports the saving when direct is cheaper", () => {
    assert.deepEqual(compareWithAirbnb(stay), {
      airbnbNightlyTotal: 25800,
      directNightlyTotal: 24864,
      savings: 936,
      airbnbUrl: AIRBNB_URL,
    });
  });

  it("hides itself when off, unknown, or not a saving", () => {
    assert.equal(compareWithAirbnb({ ...stay, enabled: false }), null);
    assert.equal(compareWithAirbnb({ ...stay, days: undefined }), null);
    // 0% Airbnb markup: Airbnb would show the base, direct is dearer.
    assert.equal(compareWithAirbnb({ ...stay, airbnbMarkupPct: 0 }), null);
    // Exactly equal is not a saving either.
    assert.equal(
      compareWithAirbnb({ ...stay, directNightlyTotal: 25800 }),
      null,
    );
    assert.equal(
      compareWithAirbnb({
        ...stay,
        checkIn: "2028-01-01",
        checkOut: "2028-01-03",
      }),
      null,
    );
  });
});

describe("normalizeQuote with comparison", () => {
  it("attaches the comparison to the Dan Jean A quote", () => {
    const quote = normalizeQuote(fixture("quote-danjean-a"), {
      propertyId: "02f700e5-a510-4c4f-b9f6-9d4bebdf499a",
      checkIn: "2026-11-02",
      checkOut: "2026-11-04",
      days: danJeanA,
      directMarkupPct: 11,
      comparison: {
        enabled: true,
        airbnbMarkupPct: 15.5,
        airbnbUrl: AIRBNB_URL,
      },
    });
    assert.equal(quote.comparison?.savings, 936);
    assert.equal(quote.comparison?.airbnbUrl, AIRBNB_URL);
  });

  it("leaves it null without the option", () => {
    const quote = normalizeQuote(fixture("quote-sample"), {
      propertyId: "2bfb62de-2f47-409f-b276-a47d5b405043",
      checkIn: "2026-11-02",
      checkOut: "2026-11-04",
      directMarkupPct: 0,
    });
    assert.equal(quote.comparison, null);
  });
});
