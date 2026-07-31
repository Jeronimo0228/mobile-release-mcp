import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withRetry, RetryableHttpError } from "../src/utils/retry.js";

describe("withRetry", () => {
  it("retries retryable HTTP errors", async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new RetryableHttpError("rate limited", 429);
        }
        return "ok";
      },
      "test",
      { baseDelayMs: 1, maxDelayMs: 2 },
    );

    assert.equal(result, "ok");
    assert.equal(attempts, 3);
  });

  it("does not retry non-retryable errors", async () => {
    let attempts = 0;

    await assert.rejects(
      () =>
        withRetry(
          async () => {
            attempts += 1;
            throw new Error("bad request");
          },
          "test",
          { baseDelayMs: 1, maxDelayMs: 2 },
        ),
      /bad request/,
    );

    assert.equal(attempts, 1);
  });
});
