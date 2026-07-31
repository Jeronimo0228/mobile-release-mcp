import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { WebhookStorage } from "../src/webhook/storage.js";

const storagePath = join(tmpdir(), `webhooks-test-${Date.now()}.json`);

afterEach(() => {
  if (existsSync(storagePath)) {
    rmSync(storagePath);
  }
});

describe("WebhookStorage", () => {
  it("persists and reloads events", () => {
    const storage = new WebhookStorage(storagePath);
    const event = storage.storeEvent({
      source: "eas",
      eventType: "BUILD",
      platform: "ios",
      status: "finished",
      payload: {
        id: "1",
        accountName: "acct",
        projectName: "demo",
        buildDetailsPageUrl: "https://expo.dev",
        appId: "eas-id",
        initiatingUserId: "user",
        platform: "ios",
        status: "finished",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });

    const reloaded = new WebhookStorage(storagePath);
    const events = reloaded.getEvents();

    assert.equal(events.length, 1);
    assert.equal(events[0]?.id, event.id);
    assert.equal(events[0]?.processed, false);

    reloaded.markProcessed(event.id);
    assert.equal(reloaded.getEvents(true).length, 0);
  });
});
