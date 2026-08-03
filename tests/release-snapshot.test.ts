import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveIosBlockers,
  deriveAndroidBlockers,
  deriveNextActions,
  explainBlockers,
} from "../src/core/release-snapshot.js";
import type { ReleaseSnapshot } from "../src/core/types.js";

describe("release-snapshot heuristics", () => {
  it("detects missing iOS build blocker", () => {
    const blockers = deriveIosBlockers({
      version: "2.0.0",
      versionId: "v1",
      state: "PREPARE_FOR_SUBMISSION",
    });
    assert.equal(blockers.some((b) => b.code === "MISSING_BUILD"), true);
  });

  it("suggests assign_build when iOS candidate lacks build", () => {
    const blockers = deriveIosBlockers({
      version: "2.0.0",
      versionId: "v1",
      state: "PREPARE_FOR_SUBMISSION",
    });
    const actions = deriveNextActions(
      {},
      {
        ios: {
          version: "2.0.0",
          versionId: "v1",
          state: "PREPARE_FOR_SUBMISSION",
        },
      },
      blockers,
    );
    assert.equal(actions[0]?.action, "assign_build");
  });

  it("suggests promote_release when android candidate not in production", () => {
    const actions = deriveNextActions(
      { android: { versionCodes: ["100"], track: "production", state: "completed" } },
      {
        android: {
          versionCodes: ["101"],
          track: "internal",
          state: "completed",
        },
      },
      [],
    );
    assert.equal(actions.some((a) => a.action === "promote_release"), true);
  });

  it("explainBlockers reports cannot proceed when errors exist", () => {
    const snapshot: ReleaseSnapshot = {
      capturedAt: new Date().toISOString(),
      production: {},
      candidate: {
        ios: {
          version: "2.0.0",
          state: "REJECTED",
        },
      },
      nextActions: [],
      blockers: deriveIosBlockers({
        version: "2.0.0",
        state: "REJECTED",
      }),
    };
    const explained = explainBlockers(snapshot);
    assert.equal(explained.canProceedToProduction, false);
    assert.match(explained.summary, /blocking/i);
  });

  it("flags android staged rollout as warning", () => {
    const blockers = deriveAndroidBlockers(
      { state: "inProgress", rollout: 0.1, versionCodes: ["50"] },
      undefined,
    );
    assert.equal(blockers.some((b) => b.code === "STAGED_ROLLOUT_ACTIVE"), true);
  });
});
