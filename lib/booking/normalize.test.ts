import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  deriveNights,
  directNightly,
  isTrustedCheckoutUrl,
  mapUpstreamQuoteError,
  markupPct,
  normalizeCalendar,
  normalizeQuote,
  UntrustedCheckoutUrlError,
} from "./normalize";
import { UpstreamPropertySchema } from "./upstream";

/*
 * Fixtures are the real responses saved during Phase 0 (discovery/), so these
 * tests pin the field names and units Hospitable actually sends.
 */
function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      new URL(`../../discovery/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
}

const DAN_JEAN_A = "02f700e5-a510-4c4f-b9f6-9d4bebdf499a";
const PARKWOOD_A = "2bfb62de-2f47-409f-b276-a47d5b405043";

describe("normalizeCalendar", () => {
  const days = normalizeCalendar(fixture("calendar-sample"));

  it("maps one entry per day with prices in cents", () => {
    assert.equal(days.length, 61);
    assert.deepEqual(days[0], {
      date: "2026-10-25",
      available: false,
      price: 30500,
      minStay: 1,
      closedToArrival: false,
      closedToDeparture: false,
    });
  });

  it("reads availability from status.available and min stay per day", () => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    assert.equal(byDate.get("2026-11-02")?.available, true);
    assert.equal(byDate.get("2026-11-02")?.price, 13000);
    assert.equal(byDate.get("2026-11-28")?.minStay, 4);
    assert.equal(byDate.get("2026-11-25")?.available, false);
  });

  it("treats host-blocked days as unavailable", () => {
    const blocked = normalizeCalendar(fixture("calendar-danjean-b")).find(
      (d) => d.date === "2027-04-23",
    );
    assert.equal(blocked?.available, false);
  });

  it("rejects a response without days", () => {
    assert.throws(() => normalizeCalendar({ data: {} }));
  });
});

describe("markupPct", () => {
  it("reads the configured percent for a channel", () => {
    const property = UpstreamPropertySchema.parse(
      (fixture("property-danjean-a-bookings") as { data: unknown }).data,
    );
    assert.equal(markupPct(property, "direct", 99), 11);
    assert.equal(markupPct(property, "airbnb", 99), 15.5);
  });

  it("falls back when the channel is missing", () => {
    assert.equal(markupPct({ bookings: null }, "direct", 11), 11);
    assert.equal(
      markupPct(
        { bookings: { fees: [], listing_markups: [] } },
        "airbnb",
        15.5,
      ),
      15.5,
    );
  });
});

describe("directNightly / deriveNights", () => {
  it("adds the markup to the cent", () => {
    assert.equal(directNightly(11200, 11), 12432);
    assert.equal(directNightly(13000, 0), 13000);
  });

  it("derives nights that add up to the quote's subtotal", () => {
    const days = normalizeCalendar(fixture("calendar-danjean-a"));
    const nights = deriveNights(days, "2026-11-02", "2026-11-04", 11, 24864);
    assert.deepEqual(nights, [
      { date: "2026-11-02", price: 12432 },
      { date: "2026-11-03", price: 12432 },
    ]);
  });

  it("absorbs a rounding cent into the last night", () => {
    const days = [
      { date: "2027-01-01", price: 10001, minStay: 1 },
      { date: "2027-01-02", price: 10001, minStay: 1 },
    ].map((d) => ({
      ...d,
      available: true,
      closedToArrival: false,
      closedToDeparture: false,
    }));
    // 10001 × 1.11 = 11101.11 per night; Hospitable rounds the total, not each night.
    const nights = deriveNights(days, "2027-01-01", "2027-01-03", 11, 22202);
    assert.deepEqual(
      nights?.map((n) => n.price),
      [11101, 11101],
    );
    const nights2 = deriveNights(days, "2027-01-01", "2027-01-03", 11, 22203);
    assert.deepEqual(
      nights2?.map((n) => n.price),
      [11101, 11102],
    );
  });

  it("gives up when a night is missing or the totals disagree", () => {
    const days = normalizeCalendar(fixture("calendar-danjean-a"));
    assert.equal(deriveNights(days, "2028-01-01", "2028-01-03", 11, 1), null);
    assert.equal(
      deriveNights(days, "2026-11-02", "2026-11-04", 11, 30000),
      null,
    );
    assert.equal(deriveNights(days, "2026-11-02", "2026-11-02", 11, 0), null);
  });
});

describe("normalizeQuote", () => {
  it("normalizes the Parkwood A sample (0% markup)", () => {
    const days = normalizeCalendar(fixture("calendar-sample"));
    const quote = normalizeQuote(fixture("quote-sample"), {
      propertyId: PARKWOOD_A,
      checkIn: "2026-11-02",
      checkOut: "2026-11-04",
      days,
      directMarkupPct: 0,
    });
    assert.equal(quote.quoteId, "d85cc4f6-9917-4dbc-9265-115742fd769b");
    assert.equal(
      quote.bookingUrl,
      "https://booking.hospitable.com/book/external/2338067/d85cc4f6-9917-4dbc-9265-115742fd769b",
    );
    assert.equal(quote.nightCount, 2);
    assert.deepEqual(quote.nights, [
      { date: "2026-11-02", price: 13000 },
      { date: "2026-11-03", price: 13300 },
    ]);
    assert.equal(quote.subTotal, 26300);
    assert.equal(quote.cleaningFee, 15100);
    // The $0 service fee line is dropped.
    assert.deepEqual(quote.fees, [{ label: "Cleaning fee", amount: 15100 }]);
    assert.deepEqual(quote.taxLines, [
      { label: "State lodging tax", amount: 2484 },
      { label: "City lodging tax", amount: 4554 },
    ]);
    assert.equal(quote.taxes, 7038);
    assert.equal(quote.total, 48438);
    assert.equal(quote.currency, "USD");
    assert.equal(quote.quoteExpiresAt, null);
    assert.deepEqual(quote.discounts, []);
  });

  it("normalizes the Dan Jean A quote (11% markup) with a reconciled breakdown", () => {
    const days = normalizeCalendar(fixture("calendar-danjean-a"));
    const quote = normalizeQuote(fixture("quote-danjean-a"), {
      propertyId: DAN_JEAN_A,
      checkIn: "2026-11-02",
      checkOut: "2026-11-04",
      days,
      directMarkupPct: 11,
    });
    assert.equal(quote.subTotal, 24864);
    assert.equal(quote.total, 46759);
    assert.deepEqual(
      quote.nights?.map((n) => n.price),
      [12432, 12432],
    );
  });

  it("leaves nights null without calendar days", () => {
    const quote = normalizeQuote(fixture("quote-sample"), {
      propertyId: PARKWOOD_A,
      checkIn: "2026-11-02",
      checkOut: "2026-11-04",
      directMarkupPct: 0,
    });
    assert.equal(quote.nights, null);
    assert.equal(quote.subTotal, 26300);
  });

  it("refuses a booking_url off the Hospitable checkout host", () => {
    const raw = structuredClone(fixture("quote-sample")) as {
      data: { booking_url: string };
    };
    raw.data.booking_url = "https://evil.example/book";
    assert.throws(
      () =>
        normalizeQuote(raw, {
          propertyId: PARKWOOD_A,
          checkIn: "2026-11-02",
          checkOut: "2026-11-04",
          directMarkupPct: 0,
        }),
      UntrustedCheckoutUrlError,
    );
  });
});

describe("isTrustedCheckoutUrl", () => {
  it("accepts only https on booking.hospitable.com", () => {
    assert.equal(
      isTrustedCheckoutUrl("https://booking.hospitable.com/book/external/1/2"),
      true,
    );
    assert.equal(
      isTrustedCheckoutUrl("http://booking.hospitable.com/x"),
      false,
    );
    assert.equal(
      isTrustedCheckoutUrl("https://booking.hospitable.com.evil/x"),
      false,
    );
    assert.equal(isTrustedCheckoutUrl("not a url"), false);
  });
});

describe("mapUpstreamQuoteError", () => {
  const body = (name: string) =>
    fixture(name) as { reason_phrase: string; status_code: number };

  it("maps unavailable dates to UNAVAILABLE (409)", () => {
    const mapped = mapUpstreamQuoteError(422, body("quote-error-unavailable"));
    assert.equal(mapped.code, "UNAVAILABLE");
    assert.equal(mapped.status, 409);
  });

  it("maps a minimum-stay rejection to MIN_STAY (422)", () => {
    const mapped = mapUpstreamQuoteError(422, body("quote-error-minstay"));
    assert.equal(mapped.code, "MIN_STAY");
    assert.equal(mapped.status, 422);
  });

  it("maps validation (400) and the generic 422 to INVALID", () => {
    assert.equal(
      mapUpstreamQuoteError(400, {
        reason_phrase: "The guest details.email must be a valid email address.",
      }).code,
      "INVALID",
    );
    assert.equal(
      mapUpstreamQuoteError(422, {
        reason_phrase: "There was an issue creating the Quote.",
      }).code,
      "INVALID",
    );
  });

  it("maps everything else to UPSTREAM (502)", () => {
    assert.equal(mapUpstreamQuoteError(500, null).code, "UPSTREAM");
    assert.equal(mapUpstreamQuoteError(0, null).status, 502);
    assert.equal(
      mapUpstreamQuoteError(401, { reason_phrase: "Unauthenticated." }).code,
      "UPSTREAM",
    );
  });
});
