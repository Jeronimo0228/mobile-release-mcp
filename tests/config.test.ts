import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, validateConfig } from "../src/utils/config.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("validateConfig", () => {
  it("requires at least one store credential provider", () => {
    delete process.env.APPLE_KEY_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

    const config = loadConfig();
    const validation = validateConfig(config);

    assert.equal(validation.valid, false);
    assert.match(validation.errors.join(" "), /No store credentials/);
  });

  it("passes with Apple credentials only in stdio mode", () => {
    process.env.APPLE_KEY_ID = "KEY";
    process.env.APPLE_ISSUER_ID = "ISSUER";
    process.env.APPLE_PRIVATE_KEY_BASE64 = Buffer.from(
      "fake-key",
    ).toString("base64");
    process.env.MCP_TRANSPORT = "stdio";
    delete process.env.EAS_WEBHOOK_SECRET;
    delete process.env.GITHUB_WEBHOOK_SECRET;

    const config = loadConfig();
    const validation = validateConfig(config);

    assert.equal(validation.valid, true);
  });

  it("requires webhook secrets in HTTP mode by default", () => {
    process.env.APPLE_KEY_ID = "KEY";
    process.env.APPLE_ISSUER_ID = "ISSUER";
    process.env.APPLE_PRIVATE_KEY_BASE64 = Buffer.from(
      "fake-key",
    ).toString("base64");
    process.env.MCP_TRANSPORT = "http";
    process.env.MCP_HTTP_API_KEY = "x".repeat(32);
    delete process.env.EAS_WEBHOOK_SECRET;
    delete process.env.GITHUB_WEBHOOK_SECRET;

    const config = loadConfig();
    const validation = validateConfig(config);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((e) => e.includes("EAS_WEBHOOK_SECRET")));
  });

  it("requires MCP_HTTP_API_KEY in HTTP mode", () => {
    process.env.APPLE_KEY_ID = "KEY";
    process.env.APPLE_ISSUER_ID = "ISSUER";
    process.env.APPLE_PRIVATE_KEY_BASE64 = Buffer.from(
      "fake-key",
    ).toString("base64");
    process.env.MCP_TRANSPORT = "http";
    process.env.EAS_WEBHOOK_SECRET = "eas-secret";
    process.env.GITHUB_WEBHOOK_SECRET = "github-secret";
    delete process.env.MCP_HTTP_API_KEY;

    const config = loadConfig();
    const validation = validateConfig(config);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((e) => e.includes("MCP_HTTP_API_KEY")));
  });

  it("parses EAS project mappings from JSON", () => {
    process.env.EAS_PROJECT_MAPPINGS = JSON.stringify([
      {
        projectName: "my-app",
        iosAppId: "123",
        androidPackageName: "com.example.app",
      },
    ]);

    const config = loadConfig();
    assert.equal(config.easProjectMappings.length, 1);
    assert.equal(config.easProjectMappings[0]?.iosAppId, "123");
  });
});
