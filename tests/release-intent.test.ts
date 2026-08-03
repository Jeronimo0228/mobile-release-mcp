import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeIntent } from "../src/core/release-intent.js";
import type { ProjectProfile } from "../src/core/types.js";

const profile: ProjectProfile = {
  project: "plazario",
  configPath: "/tmp/storepilot.yaml",
  projectDir: "/tmp",
  stores: {
    ios: { appId: "6793579931", bundleId: "com.hrip.app" },
    android: { package: "com.hrip.app" },
  },
  release: {
    defaultRollout: 0.1,
    tracks: {
      internal: "internal",
      production: "production",
    },
  },
};

describe("release-intent", () => {
  it("plans android rollout from defaultRollout fraction", () => {
    const plan = describeIntent(
      { intent: "configure_rollout", platforms: ["android"] },
      profile,
    );
    assert.equal(plan.steps.length, 1);
    assert.equal(plan.steps[0]?.params?.percentage, 10);
  });

  it("plans promote with userFraction from profile", () => {
    const plan = describeIntent(
      { intent: "promote_to_production", platforms: ["android"] },
      profile,
    );
    assert.equal(plan.steps[0]?.params?.userFraction, 0.1);
  });

  it("plans submit_for_review when versionId provided", () => {
    const plan = describeIntent(
      {
        intent: "submit_for_review",
        platforms: ["ios"],
        versionId: "ver-1",
      },
      profile,
    );
    assert.equal(plan.steps[0]?.action, "submit_for_review");
  });
});
