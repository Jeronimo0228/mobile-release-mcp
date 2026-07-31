import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertBodySize,
  resolveSafeStoragePath,
  secureCompare,
} from "../src/utils/security.js";

describe("security utils", () => {
  it("rejects path traversal in storage path", () => {
    assert.throws(
      () => resolveSafeStoragePath("../etc/passwd"),
      /must not contain/,
    );
  });

  it("rejects absolute storage paths", () => {
    assert.throws(
      () => resolveSafeStoragePath("/tmp/webhooks.json"),
      /relative path/,
    );
  });

  it("compares secrets in constant time", () => {
    assert.equal(secureCompare("secret-a", "secret-a"), true);
    assert.equal(secureCompare("secret-a", "secret-b"), false);
  });

  it("rejects oversized webhook bodies", () => {
    assert.throws(
      () => assertBodySize("x".repeat(300_000), 256 * 1024),
      /exceeds/,
    );
  });
});
