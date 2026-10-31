import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { withRetry } from "./retry";

const noSleep = async () => {};

describe("withRetry", () => {
  it("returns the first success without retrying", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        return "ok";
      },
      { shouldRetry: () => true, sleep: noSleep },
    );
    assert.equal(result, "ok");
    assert.equal(calls, 1);
  });

  it("retries once by default when the error qualifies", async () => {
    let calls = 0;
    const retried: number[] = [];
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw new Error("transient");
        return "second time";
      },
      {
        shouldRetry: () => true,
        onRetry: (_error, attempt) => retried.push(attempt),
        sleep: noSleep,
      },
    );
    assert.equal(result, "second time");
    assert.equal(calls, 2);
    assert.deepEqual(retried, [1]);
  });

  it("gives up after the configured attempts and rethrows the last error", async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls += 1;
          throw new Error(`fail ${calls}`);
        },
        { attempts: 3, shouldRetry: () => true, sleep: noSleep },
      ),
      /fail 3/,
    );
    assert.equal(calls, 3);
  });

  it("does not retry an error the caller rules out", async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("permanent");
        },
        {
          shouldRetry: (error) => !/permanent/.test(String(error)),
          sleep: noSleep,
        },
      ),
      /permanent/,
    );
    assert.equal(calls, 1);
  });

  it("waits the configured delay before the retry", async () => {
    const waits: number[] = [];
    let calls = 0;
    await withRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw new Error("once");
      },
      {
        delayMs: 250,
        shouldRetry: () => true,
        sleep: async (ms) => {
          waits.push(ms);
        },
      },
    );
    assert.deepEqual(waits, [250]);
  });
});
