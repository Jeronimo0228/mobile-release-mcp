import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { md5ChecksumBase64 } from "../src/utils/apple-assets.js";

describe("apple-assets", () => {
  it("computes MD5 checksum base64 for Apple upload commit", () => {
    const checksum = md5ChecksumBase64(Buffer.from("hello"));
    assert.equal(checksum, "XUFAKrxLKna5cZ2REBfFkg==");
  });
});
