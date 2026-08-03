import type { AppleClient } from "../providers/apple/client.js";
import type { GooglePlayClient } from "../providers/google/client.js";
import type { ProjectProfile } from "./types.js";
import { buildReleaseSnapshot } from "./release-snapshot.js";
import {
  executeConfigureRollout,
  executePromoteRelease,
} from "./release-workflows.js";
import {
  appendProjectHistory,
  resolveStoreIds,
  resolveAndroidTrack,
} from "./project-profile.js";
import { runBeforeReleaseIntentHooks } from "../plugins/types.js";
import * as submissions from "../providers/apple/submissions.js";

function normalizeRolloutPercent(value: number | undefined, fallback = 10): number {
  const v = value ?? fallback;
  return v <= 1 ? v * 100 : v;
}

function normalizeUserFraction(value: number | undefined, fallback = 0.1): number {
  const v = value ?? fallback;
  return v <= 1 ? v : v / 100;
}

export type ReleaseIntent =
  | "rollout_production"
  | "promote_to_production"
  | "submit_for_review"
  | "configure_rollout";

export interface ReleaseIntentInput {
  intent: ReleaseIntent;
  platforms?: Array<"ios" | "android">;
  percentage?: number;
  appleAppId?: string;
  googlePackageName?: string;
  versionId?: string;
  buildId?: string;
  fromTrack?: string;
  toTrack?: string;
}

export interface ReleaseIntentPlan {
  intent: ReleaseIntent;
  description: string;
  steps: Array<{ platform: string; action: string; params?: Record<string, unknown> }>;
}

export function describeIntent(
  input: ReleaseIntentInput,
  profile?: ProjectProfile,
): ReleaseIntentPlan {
  const ids = resolveStoreIds(profile, {
    appleAppId: input.appleAppId,
    googlePackageName: input.googlePackageName,
  });
  const platforms =
    input.platforms ??
    ([
      ids.appleAppId ? "ios" : undefined,
      ids.googlePackageName ? "android" : undefined,
    ].filter(Boolean) as Array<"ios" | "android">);

  const steps: ReleaseIntentPlan["steps"] = [];

  switch (input.intent) {
    case "rollout_production":
    case "configure_rollout": {
      const pct = normalizeRolloutPercent(
        input.percentage,
        profile?.release?.defaultRollout != null
          ? normalizeRolloutPercent(profile.release.defaultRollout)
          : 10,
      );
      if (platforms.includes("android")) {
        steps.push({
          platform: "android",
          action: "configure_rollout",
          params: {
            track: resolveAndroidTrack(profile, "production", "production"),
            percentage: pct,
          },
        });
      }
      if (platforms.includes("ios") && input.versionId) {
        steps.push({
          platform: "ios",
          action: "configure_phased_release",
          params: { versionId: input.versionId, percentage: pct },
        });
      }
      return {
        intent: input.intent,
        description: `Configure ${pct}% staged rollout on production`,
        steps,
      };
    }
    case "promote_to_production": {
      if (platforms.includes("android")) {
        steps.push({
          platform: "android",
          action: "promote_release",
          params: {
            fromTrack:
              input.fromTrack ??
              resolveAndroidTrack(profile, "internal", "internal"),
            toTrack:
              input.toTrack ??
              resolveAndroidTrack(profile, "production", "production"),
            userFraction: normalizeUserFraction(
              input.percentage != null
                ? input.percentage <= 1
                  ? input.percentage
                  : input.percentage / 100
                : undefined,
              profile?.release?.defaultRollout ?? 0.1,
            ),
          },
        });
      }
      if (platforms.includes("ios")) {
        steps.push({
          platform: "ios",
          action: "submit_for_review",
          params: { versionId: input.versionId, buildId: input.buildId },
        });
      }
      return {
        intent: input.intent,
        description: "Promote candidate release to production / App Store review",
        steps,
      };
    }
    case "submit_for_review": {
      if (platforms.includes("ios") && input.versionId) {
        steps.push({
          platform: "ios",
          action: "submit_for_review",
          params: { versionId: input.versionId },
        });
      }
      return {
        intent: input.intent,
        description: "Submit iOS App Store version for review",
        steps,
      };
    }
    default:
      return {
        intent: input.intent,
        description: "Unknown intent",
        steps,
      };
  }
}

export async function executeReleaseIntent(
  appleClient: AppleClient | undefined,
  googleClient: GooglePlayClient | undefined,
  profile: ProjectProfile | undefined,
  input: ReleaseIntentInput,
  dryRun: boolean,
) {
  const plan = describeIntent(input, profile);

  const hookCheck = await runBeforeReleaseIntentHooks(input.intent, {
    projectId: profile?.project,
    appleAppId: input.appleAppId ?? profile?.stores?.ios?.appId,
    googlePackageName:
      input.googlePackageName ?? profile?.stores?.android?.package,
  });
  if (!hookCheck.allow) {
    return { dryRun, plan, blocked: true, reasons: hookCheck.reasons };
  }

  if (dryRun) {
    const snapshot = await buildReleaseSnapshot(appleClient, googleClient, {
      profile,
      appleAppId: input.appleAppId ?? profile?.stores?.ios?.appId,
      googlePackageName:
        input.googlePackageName ?? profile?.stores?.android?.package,
    });
    return { dryRun: true, plan, snapshot };
  }

  const results: Record<string, unknown> = { plan, executed: [] as unknown[] };
  const executed = results.executed as Array<Record<string, unknown>>;

  for (const step of plan.steps) {
    if (step.platform === "android" && googleClient) {
      if (step.action === "promote_release") {
        const r = await executePromoteRelease(
          appleClient,
          googleClient,
          profile,
          {
            platform: "android",
            fromTrack: step.params?.fromTrack as string | undefined,
            toTrack: step.params?.toTrack as string | undefined,
            userFraction: step.params?.userFraction as number | undefined,
            googlePackageName:
              input.googlePackageName ?? profile?.stores?.android?.package,
          },
        );
        executed.push({ step, result: r });
      } else if (step.action === "configure_rollout") {
        const r = await executeConfigureRollout(
          appleClient,
          googleClient,
          profile,
          {
            platform: "android",
            percentage: step.params?.percentage as number,
            track: step.params?.track as string | undefined,
            googlePackageName:
              input.googlePackageName ?? profile?.stores?.android?.package,
          },
        );
        executed.push({ step, result: r });
      }
    }

    if (step.platform === "ios" && appleClient) {
      if (step.action === "submit_for_review" && input.versionId) {
        const r = await submissions.submitForReview(
          appleClient,
          input.versionId,
        );
        executed.push({ step, result: r });
      } else if (step.action === "configure_phased_release" && input.versionId) {
        const pct = (step.params?.percentage as number) ?? 10;
        const r = await executeConfigureRollout(
          appleClient,
          googleClient,
          profile,
          {
            platform: "ios",
            percentage: pct,
            versionId: input.versionId,
          },
        );
        executed.push({ step, result: r });
      }
    }
  }

  if (profile) {
    appendProjectHistory(profile, {
      action: "execute_release_intent",
      platform: "both",
      result: "success",
      details: input.intent,
    });
  }

  return { dryRun: false, ...results };
}
