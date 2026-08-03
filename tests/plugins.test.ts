import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerPlugin, runBeforeReleaseIntentHooks } from "../src/plugins/types.js";

describe("plugin hooks", () => {
  it("blocks release when plugin returns allow: false", async () => {
    registerPlugin({
      name: "test-blocker",
      version: "1.0.0",
      hooks: {
        name: "test-blocker",
        beforeReleaseIntent: async () => ({
          allow: false,
          reason: "Friday deploy freeze",
        }),
      },
    });

    const result = await runBeforeReleaseIntentHooks("promote_to_production", {
      projectId: "demo",
    });
    assert.equal(result.allow, false);
    assert.ok(result.reasons.some((r) => r.includes("Friday")));
  });
});
