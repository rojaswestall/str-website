import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertAreaPicksValid,
  getTravel,
  sortPicksNear,
  type TravelPick,
} from "./area-travel";

const HOUSES = ["oak-hill", "south-austin"];

function pick(
  id: string,
  driveMinutes: Record<string, number | null>,
  walkMinutes?: Record<string, number>,
): TravelPick {
  return { id, driveMinutes, walkMinutes };
}

describe("getTravel", () => {
  it("uses the walk time for a house that has one", () => {
    const p = pick(
      "cafe",
      { "oak-hill": 12, "south-austin": 2 },
      {
        "south-austin": 8,
      },
    );
    assert.deepEqual(getTravel(p, "south-austin"), {
      mode: "walk",
      minutes: 8,
    });
  });

  it("falls back to the drive time for houses without a walk time", () => {
    const p = pick(
      "cafe",
      { "oak-hill": 12, "south-austin": 2 },
      {
        "south-austin": 8,
      },
    );
    assert.deepEqual(getTravel(p, "oak-hill"), { mode: "drive", minutes: 12 });
  });

  it("reports an unconfirmed or missing drive time as null", () => {
    const p = pick("park", { "oak-hill": null, "south-austin": 5 });
    assert.deepEqual(getTravel(p, "oak-hill"), {
      mode: "drive",
      minutes: null,
    });
    assert.deepEqual(getTravel(p, "nowhere"), { mode: "drive", minutes: null });
  });
});

describe("sortPicksNear", () => {
  const picks = [
    pick("untimed-a", { "south-austin": null }),
    pick("drive-20", { "south-austin": 20 }),
    pick("walk-12", { "south-austin": 3 }, { "south-austin": 12 }),
    pick("drive-4", { "south-austin": 4 }),
    pick("walk-7", { "south-austin": 2 }, { "south-austin": 7 }),
    pick("untimed-b", { "south-austin": null }),
  ];
  const order = (slug: string) => sortPicksNear(picks, slug).map((p) => p.id);

  it("puts walks first, shortest walk first, then drives by time", () => {
    assert.deepEqual(order("south-austin").slice(0, 4), [
      "walk-7",
      "walk-12",
      "drive-4",
      "drive-20",
    ]);
  });

  it("ranks a long walk ahead of a short drive", () => {
    const ids = order("south-austin");
    assert.ok(ids.indexOf("walk-12") < ids.indexOf("drive-4"));
  });

  it("keeps untimed picks last, in content order", () => {
    assert.deepEqual(order("south-austin").slice(-2), [
      "untimed-a",
      "untimed-b",
    ]);
  });

  it("does not reorder the input array", () => {
    const before = picks.map((p) => p.id);
    sortPicksNear(picks, "south-austin");
    assert.deepEqual(
      picks.map((p) => p.id),
      before,
    );
  });
});

describe("assertAreaPicksValid", () => {
  const ok = pick("ok", { "oak-hill": 10, "south-austin": null });

  it("accepts picks with a drive entry for every house", () => {
    assert.doesNotThrow(() =>
      assertAreaPicksValid(
        [
          ok,
          pick("walk", { "oak-hill": 1, "south-austin": 9 }, { "oak-hill": 5 }),
        ],
        HOUSES,
      ),
    );
  });

  it("rejects duplicate ids", () => {
    assert.throws(
      () => assertAreaPicksValid([ok, ok], HOUSES),
      /duplicate pick id "ok"/,
    );
  });

  it("rejects a pick missing a house's drive entry", () => {
    assert.throws(
      () => assertAreaPicksValid([pick("short", { "oak-hill": 10 })], HOUSES),
      /needs driveMinutes for exactly oak-hill, south-austin/,
    );
  });

  it("rejects a drive entry for a house that does not exist", () => {
    assert.throws(
      () =>
        assertAreaPicksValid(
          [pick("extra", { "oak-hill": 1, "south-austin": 2, mars: 3 })],
          HOUSES,
        ),
      /needs driveMinutes for exactly/,
    );
  });

  it("rejects a walk time for a house that does not exist", () => {
    assert.throws(
      () =>
        assertAreaPicksValid(
          [pick("walk", { "oak-hill": 1, "south-austin": 2 }, { mars: 4 })],
          HOUSES,
        ),
      /walkMinutes for unknown house "mars"/,
    );
  });
});
