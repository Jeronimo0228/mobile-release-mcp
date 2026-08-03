import type { AppleClient } from "../providers/apple/client.js";
import type { GooglePlayClient } from "../providers/google/client.js";
import * as testflight from "../providers/apple/testflight.js";
import * as tracks from "../providers/google/tracks.js";
import * as appInfo from "../providers/apple/appInfo.js";
import * as submissions from "../providers/apple/submissions.js";
import {
  appendProjectHistory,
  resolveAndroidTrack,
} from "./project-profile.js";
import type { ProjectProfile } from "./types.js";

export type TesterGroupType = "internal" | "closed" | "open";

export interface CreateTesterGroupPlan {
  platform: "ios" | "android" | "both";
  name: string;
  type: TesterGroupType;
  ios?: {
    appId: string;
    isInternal: boolean;
    betaGroupId?: string;
    testersAdded?: number;
  };
  android?: {
    packageName: string;
    track: string;
    googleGroups?: string[];
  };
}

export interface PromoteReleasePlan {
  platform: "ios" | "android";
  ios?: {
    action: "submit_for_beta_review" | "submit_for_review" | "already_in_review";
    appId?: string;
    buildId?: string;
    versionId?: string;
    reason: string;
  };
  android?: {
    fromTrack: string;
    toTrack: string;
    versionCodes: string[];
    status: string;
    userFraction?: number;
  };
}

export interface ConfigureRolloutPlan {
  platform: "ios" | "android";
  percentage: number;
  ios?: {
    versionId: string;
    phasedReleaseState: "ACTIVE" | "PAUSED" | "COMPLETE";
  };
  android?: {
    packageName: string;
    track: string;
    userFraction: number;
    versionCodes?: string[];
  };
}

function mapTesterTypeToAndroidTrack(
  profile: ProjectProfile | undefined,
  type: TesterGroupType,
): string {
  switch (type) {
    case "internal":
      return resolveAndroidTrack(profile, "internal", "internal");
    case "closed":
      return resolveAndroidTrack(profile, "closed", "alpha");
    case "open":
      return resolveAndroidTrack(profile, "open", "beta");
    default:
      return "internal";
  }
}

export async function planCreateTesterGroup(
  appleClient: AppleClient | undefined,
  googleClient: GooglePlayClient | undefined,
  profile: ProjectProfile | undefined,
  input: {
    platform: "ios" | "android" | "both";
    name: string;
    type: TesterGroupType;
    testers?: Array<{ email: string; firstName?: string; lastName?: string }>;
    googleGroups?: string[];
    appleAppId?: string;
    googlePackageName?: string;
  },
): Promise<CreateTesterGroupPlan> {
  const plan: CreateTesterGroupPlan = {
    platform: input.platform,
    name: input.name,
    type: input.type,
  };

  if (
    (input.platform === "ios" || input.platform === "both") &&
    appleClient
  ) {
    const appId = input.appleAppId ?? profile?.stores?.ios?.appId;
    if (!appId) {
      throw new Error("appleAppId required for iOS tester group (set in storepilot.yaml or tool args)");
    }
    plan.ios = {
      appId,
      isInternal: input.type === "internal",
      testersAdded: input.testers?.length ?? 0,
    };
  }

  if (
    (input.platform === "android" || input.platform === "both") &&
    googleClient
  ) {
    const packageName =
      input.googlePackageName ?? profile?.stores?.android?.package;
    if (!packageName) {
      throw new Error(
        "googlePackageName required for Android testers (set in storepilot.yaml or tool args)",
      );
    }
    plan.android = {
      packageName,
      track: mapTesterTypeToAndroidTrack(profile, input.type),
      googleGroups: input.googleGroups,
    };
  }

  return plan;
}

export async function executeCreateTesterGroup(
  appleClient: AppleClient | undefined,
  googleClient: GooglePlayClient | undefined,
  profile: ProjectProfile | undefined,
  input: Parameters<typeof planCreateTesterGroup>[3],
): Promise<{ plan: CreateTesterGroupPlan; results: Record<string, unknown> }> {
  const plan = await planCreateTesterGroup(
    appleClient,
    googleClient,
    profile,
    input,
  );
  const results: Record<string, unknown> = {};

  if (plan.ios && appleClient) {
    const group = await testflight.createBetaGroup(
      appleClient,
      plan.ios.appId,
      input.name,
      plan.ios.isInternal,
    );
    const groupId = (group as { data: { id: string } }).data.id;
    plan.ios.betaGroupId = groupId;
    results.ios = { betaGroupId: groupId, name: input.name };

    if (input.testers?.length) {
      const addResults = await testflight.addBetaTesters(
        appleClient,
        groupId,
        input.testers,
      );
      results.ios = {
        ...(results.ios as object),
        testers: addResults.map((r, i) => ({
          email: input.testers![i].email,
          status: r.status,
        })),
      };
    }
  }

  if (plan.android && googleClient) {
    const editId = await googleClient.createEdit(plan.android.packageName);
    const updated = await googleClient.api.edits.testers.update({
      packageName: plan.android.packageName,
      editId,
      track: plan.android.track,
      requestBody: { googleGroups: input.googleGroups },
    });
    await googleClient.commitEdit(plan.android.packageName, editId);
    results.android = {
      track: plan.android.track,
      googleGroups: updated.data.googleGroups,
    };
  }

  if (profile) {
    appendProjectHistory(profile, {
      action: "create_tester_group",
      platform: input.platform,
      result: "success",
      details: input.name,
    });
  }

  return { plan, results };
}

export async function planPromoteRelease(
  appleClient: AppleClient | undefined,
  googleClient: GooglePlayClient | undefined,
  profile: ProjectProfile | undefined,
  input: {
    platform: "ios" | "android";
    fromTrack?: string;
    toTrack?: string;
    appleAppId?: string;
    googlePackageName?: string;
    buildId?: string;
    versionId?: string;
    userFraction?: number;
    releaseNotes?: Array<{ language: string; text: string }>;
  },
): Promise<PromoteReleasePlan> {
  if (input.platform === "android") {
    const packageName =
      input.googlePackageName ?? profile?.stores?.android?.package;
    if (!packageName || !googleClient) {
      throw new Error("Google Play credentials and package name required");
    }

    const fromTrack =
      input.fromTrack ??
      resolveAndroidTrack(profile, "internal", "internal");
    const toTrack =
      input.toTrack ??
      resolveAndroidTrack(profile, "production", "production");

    const editId = await googleClient.createEdit(packageName);
    try {
      const source = await tracks.getTrack(
        googleClient,
        packageName,
        editId,
        fromTrack,
      );
      const active = source.releases?.find(
        (r) => r.status === "completed" || r.status === "inProgress",
      );
      if (!active?.versionCodes?.length) {
        throw new Error(`No releasable version on track "${fromTrack}"`);
      }

      const status =
        toTrack === "production" && input.userFraction != null
          ? "inProgress"
          : "completed";

      return {
        platform: "android",
        android: {
          fromTrack,
          toTrack,
          versionCodes: active.versionCodes.map(String),
          status,
          userFraction: input.userFraction,
        },
      };
    } finally {
      await googleClient.deleteEdit(packageName, editId).catch(() => {});
    }
  }

  // iOS promote = submit build/version for review
  const appId = input.appleAppId ?? profile?.stores?.ios?.appId;
  if (!appleClient || !appId) {
    throw new Error("Apple credentials and appId required for iOS promote");
  }

  if (input.versionId) {
    return {
      platform: "ios",
      ios: {
        action: "submit_for_review",
        appId,
        versionId: input.versionId,
        reason: "Submit App Store version for review",
      },
    };
  }

  if (input.buildId) {
    return {
      platform: "ios",
      ios: {
        action: "submit_for_beta_review",
        appId,
        buildId: input.buildId,
        reason: "Submit TestFlight build for beta review",
      },
    };
  }

  throw new Error(
    "For iOS promote_release provide versionId (App Store) or buildId (TestFlight)",
  );
}

export async function executePromoteRelease(
  appleClient: AppleClient | undefined,
  googleClient: GooglePlayClient | undefined,
  profile: ProjectProfile | undefined,
  input: Parameters<typeof planPromoteRelease>[3],
): Promise<{ plan: PromoteReleasePlan; results: Record<string, unknown> }> {
  const plan = await planPromoteRelease(
    appleClient,
    googleClient,
    profile,
    input,
  );
  const results: Record<string, unknown> = {};

  if (plan.android && googleClient) {
    const packageName =
      input.googlePackageName ?? profile?.stores?.android?.package!;
    const result = await tracks.promoteRelease(
      googleClient,
      packageName,
      plan.android.fromTrack as tracks.TrackName,
      plan.android.toTrack as tracks.TrackName,
      {
        userFraction: plan.android.userFraction,
        status: plan.android.status as tracks.ReleaseStatus,
        releaseNotes: input.releaseNotes,
      },
    );
    results.android = result;
  }

  if (plan.ios && appleClient) {
    if (plan.ios.action === "submit_for_review" && plan.ios.versionId) {
      results.ios = await submissions.submitForReview(
        appleClient,
        plan.ios.versionId,
      );
    } else if (
      plan.ios.action === "submit_for_beta_review" &&
      plan.ios.buildId
    ) {
      results.ios = await testflight.submitForBetaReview(
        appleClient,
        plan.ios.buildId,
      );
    }
  }

  if (profile) {
    appendProjectHistory(profile, {
      action: "promote_release",
      platform: input.platform,
      result: "success",
    });
  }

  return { plan, results };
}

export async function planConfigureRollout(
  appleClient: AppleClient | undefined,
  googleClient: GooglePlayClient | undefined,
  profile: ProjectProfile | undefined,
  input: {
    platform: "ios" | "android";
    percentage: number;
    versionId?: string;
    track?: string;
    googlePackageName?: string;
  },
): Promise<ConfigureRolloutPlan> {
  if (input.percentage < 0 || input.percentage > 100) {
    throw new Error("percentage must be between 0 and 100");
  }

  if (input.platform === "ios") {
    if (!input.versionId) {
      throw new Error("versionId required for iOS rollout (phased release)");
    }
    return {
      platform: "ios",
      percentage: input.percentage,
      ios: {
        versionId: input.versionId,
        phasedReleaseState:
          input.percentage >= 100 ? "COMPLETE" : "ACTIVE",
      },
    };
  }

  const packageName =
    input.googlePackageName ?? profile?.stores?.android?.package;
  if (!packageName || !googleClient) {
    throw new Error("Google Play credentials and package name required");
  }

  const track =
    input.track ?? resolveAndroidTrack(profile, "production", "production");
  const userFraction = input.percentage / 100;

  const editId = await googleClient.createEdit(packageName);
  try {
    const trackData = await tracks.getTrack(
      googleClient,
      packageName,
      editId,
      track,
    );
    const active = trackData.releases?.find(
      (r) => r.status === "inProgress" || r.status === "completed",
    );
    if (!active?.versionCodes?.length) {
      throw new Error(`No active release on track "${track}" to configure rollout`);
    }

    return {
      platform: "android",
      percentage: input.percentage,
      android: {
        packageName,
        track,
        userFraction,
        versionCodes: active.versionCodes.map(String),
      },
    };
  } finally {
    await googleClient.deleteEdit(packageName, editId).catch(() => {});
  }
}

export async function executeConfigureRollout(
  appleClient: AppleClient | undefined,
  googleClient: GooglePlayClient | undefined,
  profile: ProjectProfile | undefined,
  input: Parameters<typeof planConfigureRollout>[3],
): Promise<{ plan: ConfigureRolloutPlan; results: Record<string, unknown> }> {
  const plan = await planConfigureRollout(
    appleClient,
    googleClient,
    profile,
    input,
  );
  const results: Record<string, unknown> = {};

  if (plan.ios && appleClient) {
    results.ios = await appInfo.setPhasedRelease(
      appleClient,
      plan.ios.versionId,
      plan.ios.phasedReleaseState,
    );
  }

  if (plan.android && googleClient) {
    const { packageName, track, userFraction } = plan.android;
    results.android = await tracks.setRolloutFraction(
      googleClient,
      packageName,
      track as tracks.TrackName,
      userFraction,
    );
  }

  if (profile) {
    appendProjectHistory(profile, {
      action: "configure_rollout",
      platform: input.platform,
      result: "success",
      details: `${input.percentage}%`,
    });
  }

  return { plan, results };
}
