import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  IDLE_QUOTE,
  IDLE_TRACKED,
  quoteKey,
  quoteReducer,
  trackedQuoteReducer,
} from "./quote-state";
import type { BookingErrorBody, Quote } from "./types";

const quote = { quoteId: "q1", total: 46759 } as Quote;
const error: BookingErrorBody = {
  ok: false,
  code: "UPSTREAM",
  message: "down",
};

describe("quoteReducer", () => {
  it("keeps the last quote as `previous` while loading or failing", () => {
    const ready = quoteReducer(IDLE_QUOTE, { type: "success", quote });
    assert.deepEqual(ready, { status: "ready", quote });

    const loading = quoteReducer(ready, { type: "request" });
    assert.deepEqual(loading, { status: "loading", previous: quote });

    const failed = quoteReducer(loading, { type: "failure", error });
    assert.deepEqual(failed, { status: "error", error, previous: quote });

    const retrying = quoteReducer(failed, { type: "request" });
    assert.deepEqual(retrying, { status: "loading", previous: quote });
  });

  it("starts from nothing and resets to nothing", () => {
    assert.deepEqual(quoteReducer(IDLE_QUOTE, { type: "request" }), {
      status: "loading",
      previous: null,
    });
    const ready = quoteReducer(IDLE_QUOTE, { type: "success", quote });
    assert.deepEqual(quoteReducer(ready, { type: "reset" }), IDLE_QUOTE);
  });
});

describe("quoteKey", () => {
  const guests = { adults: 2, children: 0, infants: 0, pets: 0 };

  it("is null until the stay is complete", () => {
    assert.equal(
      quoteKey("p", { checkIn: null, checkOut: null }, guests),
      null,
    );
    assert.equal(
      quoteKey("p", { checkIn: "2026-11-02", checkOut: null }, guests),
      null,
    );
    assert.equal(
      quoteKey(
        undefined,
        { checkIn: "2026-11-02", checkOut: "2026-11-04" },
        guests,
      ),
      null,
    );
  });

  it("changes with any input", () => {
    const stay = { checkIn: "2026-11-02", checkOut: "2026-11-04" };
    const a = quoteKey("p", stay, guests);
    assert.equal(a, quoteKey("p", stay, { ...guests }));
    assert.notEqual(a, quoteKey("p", stay, { ...guests, pets: 1 }));
    assert.notEqual(
      a,
      quoteKey("p", { ...stay, checkOut: "2026-11-05" }, guests),
    );
    assert.notEqual(a, quoteKey("q", stay, guests));
  });
});

describe("trackedQuoteReducer", () => {
  const stay = { checkIn: "2026-11-02", checkOut: "2026-11-04" };
  const guests = { adults: 2, children: 0, infants: 0, pets: 0 };
  const k = quoteKey("p", stay, guests);

  it("accepts the first result for a stay without a prior request", () => {
    const tracked = trackedQuoteReducer(IDLE_TRACKED, {
      key: k,
      action: { type: "success", quote },
    });
    assert.deepEqual(tracked, { key: k, state: { status: "ready", quote } });
  });

  it("starts fresh when a result arrives for another stay", () => {
    const ready = trackedQuoteReducer(IDLE_TRACKED, {
      key: k,
      action: { type: "success", quote },
    });
    const other = quoteKey("p", stay, { ...guests, pets: 1 });
    const next = trackedQuoteReducer(ready, {
      key: other,
      action: { type: "failure", error },
    });
    assert.deepEqual(next, {
      key: other,
      state: { status: "error", error, previous: null },
    });
  });

  it("keeps the previous quote through a refresh of the same stay", () => {
    const ready = trackedQuoteReducer(IDLE_TRACKED, {
      key: k,
      action: { type: "success", quote },
    });
    const loading = trackedQuoteReducer(ready, {
      key: k,
      action: { type: "request" },
    });
    assert.deepEqual(loading.state, { status: "loading", previous: quote });
  });
});
