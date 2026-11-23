import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTOPLAY_BLOCKED,
  assertTikTokPostersValid,
  isFatalPlayerError,
  readPlayerMessage,
  tikTokPlayerSrc,
  tikTokVideoId,
} from "./tiktok-player";

describe("tikTokVideoId", () => {
  it("reads the id from a video URL", () => {
    assert.equal(
      tikTokVideoId(
        "https://www.tiktok.com/@exploretex/video/7648810803109367053",
      ),
      "7648810803109367053",
    );
  });

  it("returns null for a URL without one", () => {
    assert.equal(tikTokVideoId("https://www.tiktok.com/@exploretex"), null);
  });
});

describe("tikTokPlayerSrc", () => {
  it("points at the v1 player and autoplays", () => {
    assert.equal(
      tikTokPlayerSrc("123"),
      "https://www.tiktok.com/player/v1/123?autoplay=1&rel=0",
    );
  });
});

describe("readPlayerMessage", () => {
  // Payloads as the live player sends them (JSON strings).
  it("reads onPlayerReady", () => {
    assert.deepEqual(
      readPlayerMessage('{"type":"onPlayerReady","x-tiktok-player":true}'),
      { type: "ready" },
    );
  });

  it("reads onPlayerError with its code", () => {
    assert.deepEqual(
      readPlayerMessage(
        '{"type":"onPlayerError","value":{"errorCode":1001,"errorType":"INVALID_VIDEO"},"x-tiktok-player":true}',
      ),
      { type: "error", code: 1001 },
    );
  });

  it("accepts an already-parsed object", () => {
    assert.deepEqual(
      readPlayerMessage({ type: "onPlayerReady", "x-tiktok-player": true }),
      { type: "ready" },
    );
  });

  it("ignores other player events, other senders and non-JSON", () => {
    for (const data of [
      '{"type":"onStateChange","value":1,"x-tiktok-player":true}',
      '{"type":"onError","value":1,"x-tiktok-player":true}',
      '{"type":"onPlayerReady"}',
      "[tea-sdk]ready",
      null,
      42,
    ]) {
      assert.equal(readPlayerMessage(data), null, String(data));
    }
  });
});

describe("isFatalPlayerError", () => {
  it("lets blocked autoplay through and fails everything else", () => {
    assert.equal(isFatalPlayerError(AUTOPLAY_BLOCKED), false);
    assert.equal(isFatalPlayerError(1001), true);
    assert.equal(isFatalPlayerError(2001), true);
    assert.equal(isFatalPlayerError(0), true);
  });
});

describe("assertTikTokPostersValid", () => {
  const photo = { src: "/x.jpg", alt: "x", width: 3, height: 2 };
  const credit = { author: "A", license: "CC BY 4.0", source: "https://e.org" };
  const clip = (poster: string) => ({
    url: "https://www.tiktok.com/@a/video/1",
    poster,
  });

  it("accepts a poster that names a pick with a credited or owned photo", () => {
    assert.doesNotThrow(() =>
      assertTikTokPostersValid(
        [clip("credited"), clip("owned")],
        [
          { id: "credited", photo, photoCredit: credit },
          { id: "owned", photo, photoOwned: true },
        ],
      ),
    );
  });

  it("rejects an unknown pick id", () => {
    assert.throws(
      () => assertTikTokPostersValid([clip("nope")], []),
      /poster "nope", which is not an area pick id/,
    );
  });

  it("rejects a pick without a credited photo", () => {
    assert.throws(
      () =>
        assertTikTokPostersValid(
          [clip("bare"), clip("uncredited")],
          [{ id: "bare" }, { id: "uncredited", photo }],
        ),
      /that pick has no credited photo/,
    );
  });
});
