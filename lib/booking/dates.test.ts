import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addDays,
  addMonths,
  isIsoDate,
  nightsBetween,
  nightsOf,
  todayInBookingZone,
} from "./dates";

describe("isIsoDate", () => {
  it("accepts real dates and rejects the rest", () => {
    assert.equal(isIsoDate("2026-11-02"), true);
    assert.equal(isIsoDate("2028-02-29"), true);
    assert.equal(isIsoDate("2027-02-29"), false);
    assert.equal(isIsoDate("2026-13-01"), false);
    assert.equal(isIsoDate("2026-1-2"), false);
    assert.equal(isIsoDate("11/02/2026"), false);
    assert.equal(isIsoDate(20261102), false);
  });
});

describe("todayInBookingZone", () => {
  it("is the Austin date, not the UTC one", () => {
    // 03:30 UTC on Nov 3 is still 22:30 on Nov 2 in Austin (CST).
    assert.equal(
      todayInBookingZone(new Date("2026-11-03T03:30:00Z")),
      "2026-11-02",
    );
    // 06:30 UTC on Nov 3 is 00:30 on Nov 3 in Austin.
    assert.equal(
      todayInBookingZone(new Date("2026-11-03T06:30:00Z")),
      "2026-11-03",
    );
  });
});

describe("date arithmetic", () => {
  it("adds days across month and year ends", () => {
    assert.equal(addDays("2026-10-31", 1), "2026-11-01");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays("2026-11-02", -1), "2026-11-01");
  });

  it("adds months, clamping to the last day", () => {
    assert.equal(addMonths("2026-10-25", 18), "2028-04-25");
    assert.equal(addMonths("2026-08-31", 1), "2026-09-30");
    assert.equal(addMonths("2027-01-31", 1), "2027-02-28");
  });

  it("counts nights and lists them", () => {
    assert.equal(nightsBetween("2026-11-02", "2026-11-04"), 2);
    assert.equal(nightsBetween("2026-11-04", "2026-11-02"), -2);
    assert.deepEqual(nightsOf("2026-11-02", "2026-11-04"), [
      "2026-11-02",
      "2026-11-03",
    ]);
    assert.deepEqual(nightsOf("2026-11-02", "2026-11-02"), []);
  });
});
