import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyEasSignature, parseEasWebhook } from "../src/webhook/eas.js";
import { verifyGitHubSignature, parseGitHubWebhook } from "../src/webhook/github.js";

describe("EAS webhook signatures", () => {
  it("verifies valid HMAC-SHA1 signatures", () => {
    const body = JSON.stringify({ platform: "ios", status: "finished" });
    const secret = "test-secret";
    const signature = createHmac("sha1", secret).update(body).digest("hex");

    assert.equal(verifyEasSignature(body, `sha1=${signature}`, secret), true);
  });

  it("rejects invalid signatures", () => {
    const body = "{}";
    assert.equal(verifyEasSignature(body, "sha1=deadbeef", "secret"), false);
  });

  it("parses build webhooks when signature is valid", () => {
    const payload = {
      id: "1",
      accountName: "acct",
      projectName: "demo",
      buildDetailsPageUrl: "https://expo.dev/build/1",
      appId: "eas-app-id",
      initiatingUserId: "user",
      platform: "ios",
      status: "finished",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const body = JSON.stringify(payload);
    const secret = "eas-secret";
    const signature = createHmac("sha1", secret).update(body).digest("hex");

    const parsed = parseEasWebhook(body, `sha1=${signature}`, secret);
    assert.equal(parsed.event, "BUILD");
    assert.equal(parsed.payload.platform, "ios");
  });

  it("rejects webhooks when secret is missing", () => {
    assert.throws(
      () => parseEasWebhook("{}", null, ""),
      /secret is not configured/,
    );
  });
});

describe("GitHub webhook signatures", () => {
  it("verifies valid HMAC-SHA256 signatures", () => {
    const body = "{}";
    const secret = "github-secret";
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    assert.equal(
      verifyGitHubSignature(body, `sha256=${signature}`, secret),
      true,
    );
  });

  it("ignores non-workflow_run events", () => {
    const body = JSON.stringify({ action: "completed" });
    const secret = "github-secret";
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    const result = parseGitHubWebhook(
      body,
      `sha256=${signature}`,
      "push",
      secret,
    );
    assert.equal(result, null);
  });
});
