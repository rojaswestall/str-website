import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { cached, clearCache } from "./cache";

describe("cached", () => {
  beforeEach(() => clearCache());

  it("loads once within the TTL", async () => {
    let loads = 0;
    const load = async () => ++loads;
    assert.equal(await cached("k", 1000, load), 1);
    assert.equal(await cached("k", 1000, load), 1);
    assert.equal(loads, 1);
  });

  it("reloads after the TTL", async () => {
    let loads = 0;
    const load = async () => ++loads;
    await cached("k", 1000, load, 0);
    assert.equal(await cached("k", 1000, load, Date.now() + 5000), 2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    let loads = 0;
    const load = () =>
      new Promise<number>((resolve) => setTimeout(() => resolve(++loads), 10));
    const [a, b] = await Promise.all([
      cached("k", 1000, load),
      cached("k", 1000, load),
    ]);
    assert.equal(a, 1);
    assert.equal(b, 1);
    assert.equal(loads, 1);
  });

  it("does not cache a failed load", async () => {
    let calls = 0;
    const failing = async () => {
      calls++;
      throw new Error("boom");
    };
    await assert.rejects(cached("k", 1000, failing));
    await assert.rejects(cached("k", 1000, failing));
    assert.equal(calls, 2);
  });
});
