import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getBookingConfig } from "./config";

const SITE = "a2dd8e69-2e7b-4a23-a07e-718ab1e46afb";
const DAN_JEAN_A = "02f700e5-a510-4c4f-b9f6-9d4bebdf499a";

describe("getBookingConfig", () => {
  it("applies the documented defaults", () => {
    const config = getBookingConfig({});
    assert.equal(config.hospitable.pat, null);
    assert.equal(config.hospitable.customSiteId, null);
    assert.equal(config.airbnbMarkupPct, 15.5);
    assert.equal(config.directMarkupPct, 11);
    assert.deepEqual(config.airbnbListingUrls, {});
    assert.equal(config.comparisonEnabled, true);
    assert.equal(config.maxNights, 90);
    assert.equal(config.adminToken, null);
  });

  it("reads the token under either name and ignores blanks", () => {
    assert.equal(
      getBookingConfig({ HOSPITABLE_PERSONAL_ACCESS_TOKEN: "tok" }).hospitable
        .pat,
      "tok",
    );
    assert.equal(
      getBookingConfig({
        HOSPITABLE_PAT: "a",
        HOSPITABLE_PERSONAL_ACCESS_TOKEN: "b",
      }).hospitable.pat,
      "a",
    );
    assert.equal(
      getBookingConfig({ HOSPITABLE_PAT: "   " }).hospitable.pat,
      null,
    );
  });

  it("parses the overrides", () => {
    const config = getBookingConfig({
      HOSPITABLE_CUSTOM_SITE_ID: SITE,
      AIRBNB_MARKUP_PCT: "12",
      DIRECT_MARKUP_PCT: "0",
      AIRBNB_LISTING_URLS: JSON.stringify({
        [DAN_JEAN_A]: "https://www.airbnb.com/rooms/1655329029936239948",
      }),
      COMPARISON_ENABLED: "false",
      MAX_NIGHTS: "30",
      BOOKING_ADMIN_TOKEN: "0123456789abcdef",
    });
    assert.equal(config.hospitable.customSiteId, SITE);
    assert.equal(config.airbnbMarkupPct, 12);
    assert.equal(config.directMarkupPct, 0);
    assert.equal(
      config.airbnbListingUrls[DAN_JEAN_A],
      "https://www.airbnb.com/rooms/1655329029936239948",
    );
    assert.equal(config.comparisonEnabled, false);
    assert.equal(config.maxNights, 30);
    assert.equal(config.adminToken, "0123456789abcdef");
  });

  it("rejects bad values with a readable message", () => {
    assert.throws(
      () => getBookingConfig({ AIRBNB_LISTING_URLS: "{not json" }),
      /AIRBNB_LISTING_URLS/,
    );
    assert.throws(() => getBookingConfig({ MAX_NIGHTS: "0" }), /MAX_NIGHTS/);
    assert.throws(
      () => getBookingConfig({ HOSPITABLE_CUSTOM_SITE_ID: "nope" }),
      /HOSPITABLE_CUSTOM_SITE_ID/,
    );
    assert.throws(
      () => getBookingConfig({ BOOKING_ADMIN_TOKEN: "short" }),
      /BOOKING_ADMIN_TOKEN/,
    );
  });
});
