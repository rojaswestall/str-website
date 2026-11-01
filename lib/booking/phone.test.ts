import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("reads ten digits as US and keeps a country code", () => {
    assert.equal(normalizePhone("512 555 0123"), "+15125550123");
    assert.equal(normalizePhone("(512) 555-0123"), "+15125550123");
    assert.equal(normalizePhone("1-512-555-0123"), "+15125550123");
    assert.equal(normalizePhone("+1 512 555 0123"), "+15125550123");
    assert.equal(normalizePhone("+44 20 7946 0958"), "+442079460958");
  });

  it("rejects what it cannot read", () => {
    assert.equal(normalizePhone(""), null);
    assert.equal(normalizePhone("555-0123"), null);
    assert.equal(normalizePhone("+0 123"), null);
    assert.equal(normalizePhone("2 512 555 0123"), null);
    assert.equal(normalizePhone("+12345678901234567"), null);
  });
});
