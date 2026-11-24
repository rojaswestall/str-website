import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertAreaPicksValid,
  getTravel,
  sortPicksNear,
  type CheckedPick,
  type TravelPick,
  TRAVEL_BANDS,
  travelBand,
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

  describe("photo credits", () => {
    const photo = {
      src: "/photos/area/x.jpg",
      alt: "x",
      width: 1200,
      height: 800,
    };
    const base = {
      id: "pic",
      driveMinutes: { "oak-hill": 1, "south-austin": 2 },
    };

    it("rejects a photo with no credit", () => {
      const p: CheckedPick = { ...base, photo };
      assert.throws(
        () => assertAreaPicksValid([p], HOUSES),
        /pick "pic" has a photo but no photoCredit/,
      );
    });

    it("accepts a credited photo, or one the hosts own", () => {
      const credited: CheckedPick = {
        ...base,
        photo,
        photoCredit: {
          author: "A",
          license: "CC BY 4.0",
          source: "https://example.org/x",
        },
      };
      const owned: CheckedPick = {
        ...base,
        id: "own",
        photo,
        photoOwned: true,
      };
      assert.doesNotThrow(() =>
        assertAreaPicksValid([credited, owned], HOUSES),
      );
    });
  });
});

describe("travelBand", () => {
  it("puts any walk in the walk band, however long", () => {
    assert.equal(travelBand({ mode: "walk", minutes: 25 }), "walk");
  });

  it("splits drives at 10 and 20 minutes", () => {
    assert.equal(travelBand({ mode: "drive", minutes: 1 }), "near");
    assert.equal(travelBand({ mode: "drive", minutes: 9 }), "near");
    assert.equal(travelBand({ mode: "drive", minutes: 10 }), "mid");
    assert.equal(travelBand({ mode: "drive", minutes: 20 }), "mid");
    assert.equal(travelBand({ mode: "drive", minutes: 21 }), "far");
  });

  it("marks an unconfirmed drive as unknown", () => {
    assert.equal(travelBand({ mode: "drive", minutes: null }), "unknown");
  });

  it("lists the bands in the same order sortPicksNear uses", () => {
    const picks = [
      pick("far", { h: 30 }),
      pick("unknown", { h: null }),
      pick("mid", { h: 15 }),
      pick("walk", { h: 2 }, { h: 9 }),
      pick("near", { h: 5 }),
    ];
    const bands = sortPicksNear(picks, "h").map((p) =>
      travelBand(getTravel(p, "h")),
    );
    assert.deepEqual(
      bands,
      TRAVEL_BANDS.map((b) => b.band),
    );
  });
});
