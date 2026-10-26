import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { normalizeCalendar } from "./normalize";
import {
  canCheckIn,
  checkOutVerdict,
  clampGuests,
  dayView,
  latestCheckOut,
  monthWeeks,
  previewNightlyDollars,
  previewTotalDollars,
  selectDate,
  toDayMap,
} from "./rules";

/*
 * Parkwood A's real 60-day calendar (__fixtures__/calendar-sample.json), from
 * 2026-10-25. Landmarks used below:
 *   Oct 29–Nov 1 reserved; Nov 2–5 free (min 1); Nov 6–7 reserved;
 *   Nov 20–21 free with min stay 2; Nov 28 free with min stay 4.
 */
const days = normalizeCalendar(
  JSON.parse(
    readFileSync(
      new URL("./__fixtures__/calendar-sample.json", import.meta.url),
      "utf8",
    ),
  ),
);
const map = toDayMap(days);
const limits = { today: "2026-10-27", maxNights: 90 };

describe("canCheckIn", () => {
  it("needs a free night on a day that is not in the past", () => {
    assert.equal(canCheckIn("2026-11-02", map, limits), true);
    assert.equal(canCheckIn("2026-10-30", map, limits), false); // reserved
    assert.equal(canCheckIn("2026-10-26", map, limits), false); // yesterday
    assert.equal(canCheckIn("2027-06-01", map, limits), false); // not loaded
  });

  it("respects closed-to-arrival", () => {
    const closed = new Map(map);
    closed.set("2026-11-02", {
      ...map.get("2026-11-02")!,
      closedToArrival: true,
    });
    assert.equal(canCheckIn("2026-11-02", closed, limits), false);
  });
});

describe("checkOutVerdict", () => {
  it("accepts a stay over free nights, ending on a reserved arrival day", () => {
    // Nov 2–6: nights 2,3,4,5 free; Nov 6 is reserved but can be departed on.
    assert.deepEqual(checkOutVerdict("2026-11-02", "2026-11-06", map, limits), {
      ok: true,
      nights: 4,
    });
  });

  it("rejects a stay that crosses a reserved night", () => {
    const verdict = checkOutVerdict("2026-11-02", "2026-11-08", map, limits);
    assert.equal(verdict.ok, false);
    assert.equal(!verdict.ok && verdict.reason, "unavailable");
  });

  it("enforces the check-in day's minimum stay", () => {
    const verdict = checkOutVerdict("2026-11-28", "2026-11-30", map, limits);
    assert.deepEqual(verdict, {
      ok: false,
      reason: "min-stay",
      nights: 2,
      minStay: 4,
    });
    // A longer-minimum night inside the stay does not matter (check-in-day based).
    assert.equal(
      checkOutVerdict("2026-11-19", "2026-11-21", map, limits).ok,
      true,
    );
  });

  it("rejects same-day, reversed, and over-long stays", () => {
    assert.equal(
      (
        checkOutVerdict("2026-11-02", "2026-11-02", map, limits) as {
          reason: string;
        }
      ).reason,
      "before-check-in",
    );
    assert.equal(
      (
        checkOutVerdict("2026-11-02", "2026-11-04", map, {
          ...limits,
          maxNights: 1,
        }) as { reason: string }
      ).reason,
      "max-nights",
    );
  });

  it("respects closed-to-departure and unknown days", () => {
    const closed = new Map(map);
    closed.set("2026-11-04", {
      ...map.get("2026-11-04")!,
      closedToDeparture: true,
    });
    assert.equal(
      (
        checkOutVerdict("2026-11-02", "2026-11-04", closed, limits) as {
          reason: string;
        }
      ).reason,
      "closed-to-departure",
    );
    assert.equal(
      (
        checkOutVerdict("2026-12-23", "2026-12-26", map, limits) as {
          reason: string;
        }
      ).reason,
      "unknown",
    );
  });
});

describe("latestCheckOut", () => {
  it("is the morning after the last free night in a row", () => {
    assert.equal(latestCheckOut("2026-11-02", map, limits), "2026-11-06");
    assert.equal(latestCheckOut("2026-10-30", map, limits), null);
    assert.equal(
      latestCheckOut("2026-11-02", map, { ...limits, maxNights: 2 }),
      "2026-11-04",
    );
  });
});

describe("selectDate", () => {
  const none = { checkIn: null, checkOut: null };

  it("starts a stay on a free day and ignores an unavailable one", () => {
    assert.deepEqual(selectDate(none, "2026-11-02", map, limits), {
      checkIn: "2026-11-02",
      checkOut: null,
    });
    assert.deepEqual(selectDate(none, "2026-10-30", map, limits), none);
  });

  it("ends the stay on a valid check-out", () => {
    const started = { checkIn: "2026-11-02", checkOut: null };
    assert.deepEqual(selectDate(started, "2026-11-04", map, limits), {
      checkIn: "2026-11-02",
      checkOut: "2026-11-04",
    });
  });

  it("restarts from a later free day when the check-out would be invalid", () => {
    const started = { checkIn: "2026-11-02", checkOut: null };
    // Nov 8 crosses the Nov 6–7 reservation, but is itself a free day.
    assert.deepEqual(selectDate(started, "2026-11-08", map, limits), {
      checkIn: "2026-11-08",
      checkOut: null,
    });
    // Nov 7 is reserved: neither a check-out nor a check-in; nothing changes.
    assert.deepEqual(selectDate(started, "2026-11-07", map, limits), started);
  });

  it("restarts from an earlier day, and from any day once both ends are set", () => {
    const started = { checkIn: "2026-11-04", checkOut: null };
    assert.deepEqual(selectDate(started, "2026-11-02", map, limits), {
      checkIn: "2026-11-02",
      checkOut: null,
    });
    const done = { checkIn: "2026-11-02", checkOut: "2026-11-04" };
    assert.deepEqual(selectDate(done, "2026-11-09", map, limits), {
      checkIn: "2026-11-09",
      checkOut: null,
    });
  });
});

describe("dayView", () => {
  it("marks the ends and the nights between a complete stay", () => {
    const sel = { checkIn: "2026-11-02", checkOut: "2026-11-05" };
    assert.equal(
      dayView("2026-11-02", sel, null, map, limits).role,
      "check-in",
    );
    assert.equal(dayView("2026-11-03", sel, null, map, limits).role, "between");
    assert.equal(
      dayView("2026-11-05", sel, null, map, limits).role,
      "check-out",
    );
    assert.equal(dayView("2026-11-06", sel, null, map, limits).role, "none");
  });

  it("previews a pending check-out and explains blocked days", () => {
    const sel = { checkIn: "2026-11-02", checkOut: null };
    const hovered = dayView("2026-11-03", sel, "2026-11-04", map, limits);
    assert.equal(hovered.role, "between");
    assert.equal(
      dayView("2026-11-04", sel, "2026-11-04", map, limits).role,
      "check-out",
    );
    // Hovering a day the stay cannot end on previews nothing.
    assert.equal(
      dayView("2026-11-03", sel, "2026-11-08", map, limits).role,
      "none",
    );

    const crossing = dayView("2026-11-08", sel, null, map, limits);
    assert.equal(crossing.blocked, "unavailable");
    assert.equal(crossing.selectable, true); // can restart here

    const short = dayView(
      "2026-11-29",
      { checkIn: "2026-11-28", checkOut: null },
      null,
      map,
      limits,
    );
    assert.equal(short.blocked, "min-stay");
    assert.equal(short.minStay, 4);
  });

  it("flags past and unavailable days", () => {
    const none = { checkIn: null, checkOut: null };
    assert.equal(dayView("2026-10-26", none, null, map, limits).past, true);
    assert.equal(
      dayView("2026-10-30", none, null, map, limits).available,
      false,
    );
    assert.equal(
      dayView("2026-10-30", none, null, map, limits).selectable,
      false,
    );
  });
});

describe("preview prices", () => {
  it("rounds the marked-up nightly rate to whole dollars", () => {
    assert.equal(previewNightlyDollars(11200, 11), 124); // 124.32
    assert.equal(previewNightlyDollars(13000, 0), 130);
    assert.equal(previewNightlyDollars(13300, 11), 148); // 147.63
  });

  it("sums the stay, or gives up on a missing night", () => {
    assert.equal(previewTotalDollars("2026-11-02", "2026-11-04", map, 0), 263);
    assert.equal(previewTotalDollars("2026-12-23", "2026-12-26", map, 0), null);
    assert.equal(previewTotalDollars("2026-11-02", "2026-11-02", map, 0), null);
  });
});

describe("clampGuests", () => {
  const limits = { maxGuests: 8, petsAllowed: true };

  it("keeps adults + children within capacity and at least one adult", () => {
    assert.deepEqual(
      clampGuests({ adults: 0, children: 0, infants: 0, pets: 0 }, limits),
      { adults: 1, children: 0, infants: 0, pets: 0 },
    );
    assert.deepEqual(
      clampGuests({ adults: 6, children: 5, infants: 9, pets: 9 }, limits),
      { adults: 6, children: 2, infants: 5, pets: 2 },
    );
  });

  it("drops pets where they are not allowed", () => {
    assert.equal(
      clampGuests(
        { adults: 2, children: 0, infants: 0, pets: 1 },
        { maxGuests: 8, petsAllowed: false },
      ).pets,
      0,
    );
  });
});

describe("monthWeeks", () => {
  it("lays out November 2026 Sunday-first with padding", () => {
    const weeks = monthWeeks("2026-11-15");
    assert.equal(weeks.length, 5);
    assert.deepEqual(weeks[0], [
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
    assert.deepEqual(weeks[4]?.slice(0, 2), ["2026-11-29", "2026-11-30"]);
    assert.equal(weeks[4]?.[6], null);
  });

  it("pads a month that starts mid-week", () => {
    const weeks = monthWeeks("2026-10-01"); // Thursday
    assert.deepEqual(weeks[0]?.slice(0, 5), [
      null,
      null,
      null,
      null,
      "2026-10-01",
    ]);
    assert.equal(weeks.length, 5);
  });
});
