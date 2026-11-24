import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getAllProperties } from "@/content";

import { cityFrame, DOWNTOWN, type LatLng, type MapFrame } from "./map-frame";

const houses: LatLng[] = getAllProperties().map((p) => p.mapArea);

function contains(frame: MapFrame, point: LatLng) {
  return (
    Math.abs(point.latitude - frame.center.latitude) <
      frame.latitudeDelta / 2 &&
    Math.abs(point.longitude - frame.center.longitude) <
      frame.longitudeDelta / 2
  );
}

describe("cityFrame", () => {
  const frame = cityFrame(houses);

  it("shows every house and downtown", () => {
    for (const house of houses) assert.ok(contains(frame, house));
    assert.ok(contains(frame, DOWNTOWN));
  });

  it("puts downtown in the north-east and the houses south-west of it", () => {
    assert.ok(DOWNTOWN.latitude > frame.center.latitude);
    assert.ok(DOWNTOWN.longitude > frame.center.longitude);
    for (const house of houses) {
      assert.ok(house.latitude < DOWNTOWN.latitude);
      assert.ok(house.longitude < DOWNTOWN.longitude);
    }
  });

  it("stays a city-sized view", () => {
    // Roughly 8–15 km tall at Austin's latitude: the river and the houses fit,
    // the suburbs do not.
    assert.ok(frame.latitudeDelta > 0.07 && frame.latitudeDelta < 0.14);
    assert.ok(frame.longitudeDelta > 0.1 && frame.longitudeDelta < 0.2);
  });
});
