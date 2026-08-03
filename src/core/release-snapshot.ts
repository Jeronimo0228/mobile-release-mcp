import type { AppleClient } from "../providers/apple/client.js";
import type { GooglePlayClient } from "../providers/google/client.js";
import * as versions from "../providers/apple/versions.js";
import * as builds from "../providers/apple/builds.js";
import * as tracks from "../providers/google/tracks.js";
import {
  resolveAndroidTrack,
} from "./project-profile.js";
import type { ProjectProfile } from "./types.js";
import type {
  CandidateReleaseInfo,
  NextAction,
  ProductionReleaseInfo,
  ReleaseBlocker,
  ReleaseSnapshot,
} from "./types.js";

const IOS_PRODUCTION_STATES = new Set([
  "READY_FOR_SALE",
  "PROCESSING_FOR_APP_STORE",
]);

const IOS_CANDIDATE_STATES = new Set([
  "PREPARE_FOR_SUBMISSION",
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "PENDING_DEVELOPER_RELEASE",
  "PENDING_APPLE_RELEASE",
  "DEVELOPER_REJECTED",
  "REJECTED",
  "METADATA_REJECTED",
  "INVALID_BINARY",
]);

interface IosVersionRow {
  id: string;
  attributes: {
    versionString: string;
    appStoreState: string;
    platform?: string;
  };
  relationships?: {
    build?: { data?: { id?: string } | null };
  };
}

function iosProductionFromVersions(
  rows: IosVersionRow[],
): ProductionReleaseInfo | undefined {
  const live = rows.find((v) =>
    IOS_PRODUCTION_STATES.has(v.attributes.appStoreState),
  );
  if (!live) return undefined;
  return {
    version: live.attributes.versionString,
    versionId: live.id,
    buildId: live.relationships?.build?.data?.id,
    state: live.attributes.appStoreState,
    rollout: "100%",
  };
}

function iosCandidateFromVersions(
  rows: IosVersionRow[],
): CandidateReleaseInfo | undefined {
  const candidate = rows.find((v) =>
    IOS_CANDIDATE_STATES.has(v.attributes.appStoreState),
  );
  if (!candidate) return undefined;
  return {
    version: candidate.attributes.versionString,
    versionId: candidate.id,
    buildId: candidate.relationships?.build?.data?.id,
    state: candidate.attributes.appStoreState,
  };
}

function androidProductionFromTrack(
  trackData: Awaited<ReturnType<typeof tracks.getTrack>>,
  trackName: string,
): ProductionReleaseInfo | undefined {
  const active = trackData.releases?.find(
    (r) => r.status === "completed" || r.status === "inProgress",
  );
  if (!active?.versionCodes?.length) return undefined;

  return {
    versionCodes: active.versionCodes.map(String),
    state: active.status != null ? active.status : undefined,
    track: trackName,
    rollout:
      active.status === "inProgress" && active.userFraction != null
        ? active.userFraction
        : "100%",
  };
}

function androidCandidateFromTracks(
  trackList: Array<{ track?: string | null; releases?: Array<{ status?: string | null; versionCodes?: string[] | null }> | null }>,
  trackNames: string[],
): CandidateReleaseInfo | undefined {
  for (const trackName of trackNames) {
    const trackData = trackList.find((t) => t.track === trackName);
    const release = trackData?.releases?.find(
      (r) =>
        r.status === "draft" ||
        r.status === "inProgress" ||
        r.status === "completed",
    );
    if (release?.versionCodes?.length) {
      return {
        versionCodes: release.versionCodes.map(String),
        state: release.status ?? undefined,
        track: trackName,
      };
    }
  }
  return undefined;
}

export function deriveIosBlockers(
  candidate?: CandidateReleaseInfo,
): ReleaseBlocker[] {
  if (!candidate) return [];

  const blockers: ReleaseBlocker[] = [];
  const state = candidate.state ?? "";

  if (!candidate.buildId && state === "PREPARE_FOR_SUBMISSION") {
    blockers.push({
      platform: "ios",
      code: "MISSING_BUILD",
      message: `Version ${candidate.version} has no build assigned`,
      severity: "error",
      suggestion:
        "Use apple_assign_build_to_version or assign the latest build from apple_list_builds.",
    });
  }

  if (state === "REJECTED" || state === "METADATA_REJECTED") {
    blockers.push({
      platform: "ios",
      code: "REVIEW_REJECTED",
      message: `Version ${candidate.version} was rejected (${state})`,
      severity: "error",
      suggestion:
        "Review App Store Connect resolution center and update metadata before resubmitting.",
    });
  }

  if (state === "INVALID_BINARY") {
    blockers.push({
      platform: "ios",
      code: "INVALID_BINARY",
      message: `Version ${candidate.version} has an invalid binary`,
      severity: "error",
      suggestion: "Upload a new build and assign it to this version.",
    });
  }

  if (state === "WAITING_FOR_REVIEW" || state === "IN_REVIEW") {
    blockers.push({
      platform: "ios",
      code: "IN_REVIEW",
      message: `Version ${candidate.version} is in App Store review (${state})`,
      severity: "warning",
      suggestion: "Wait for Apple review or use App Store Connect to respond.",
    });
  }

  return blockers;
}

export function deriveAndroidBlockers(
  production?: ProductionReleaseInfo,
  candidate?: CandidateReleaseInfo,
): ReleaseBlocker[] {
  const blockers: ReleaseBlocker[] = [];

  if (production?.state === "inProgress") {
    blockers.push({
      platform: "android",
      code: "STAGED_ROLLOUT_ACTIVE",
      message: `Production rollout in progress (${production.rollout})`,
      severity: "warning",
      suggestion:
        "Use configure_rollout to adjust percentage or promote_release when ready.",
    });
  }

  if (candidate?.state === "draft") {
    blockers.push({
      platform: "android",
      code: "DRAFT_RELEASE",
      message: `Draft release on track "${candidate.track}" (${candidate.versionCodes?.join(", ")})`,
      severity: "warning",
      suggestion:
        "Commit the release or use promote_release to move it forward.",
    });
  }

  if (!production && !candidate) {
    blockers.push({
      platform: "android",
      code: "NO_RELEASE",
      message: "No active or candidate Android release detected",
      severity: "warning",
      suggestion:
        "Create a release on internal track first with google_create_release.",
    });
  }

  return blockers;
}

export function deriveNextActions(
  production: ReleaseSnapshot["production"],
  candidate: ReleaseSnapshot["candidate"],
  blockers: ReleaseBlocker[],
): NextAction[] {
  const actions: NextAction[] = [];

  const iosHardBlocked = blockers.some(
    (b) =>
      b.platform === "ios" &&
      b.severity === "error" &&
      !["MISSING_BUILD", "INVALID_BINARY"].includes(b.code),
  );
  const iosCandidate = candidate.ios;
  const iosState = iosCandidate?.state ?? "";

  if (iosCandidate && !iosHardBlocked) {
    if (iosState === "PREPARE_FOR_SUBMISSION" && !iosCandidate.buildId) {
      actions.push({
        platform: "ios",
        action: "assign_build",
        reason: `Version ${iosCandidate.version} needs a build before submission`,
        confidence: "high",
        params: { versionId: iosCandidate.versionId },
      });
    } else if (
      iosState === "PREPARE_FOR_SUBMISSION" &&
      iosCandidate.buildId
    ) {
      actions.push({
        platform: "ios",
        action: "submit_for_review",
        reason: `Version ${iosCandidate.version} is ready for App Store review`,
        confidence: "high",
        params: { versionId: iosCandidate.versionId },
      });
    } else if (iosState === "WAITING_FOR_REVIEW" || iosState === "IN_REVIEW") {
      actions.push({
        platform: "ios",
        action: "wait_for_review",
        reason: `Version ${iosCandidate.version} is with Apple (${iosState})`,
        confidence: "high",
      });
    } else if (iosState === "PENDING_DEVELOPER_RELEASE") {
      actions.push({
        platform: "ios",
        action: "release_to_store",
        reason: `Version ${iosCandidate.version} approved — release manually or set automatic release`,
        confidence: "high",
        params: { versionId: iosCandidate.versionId },
      });
    }
  }

  const androidCandidate = candidate.android;
  const prodTrack = production.android?.track ?? "production";
  const prodCodes = production.android?.versionCodes ?? [];
  const candCodes = androidCandidate?.versionCodes ?? [];

  if (
    androidCandidate &&
    candCodes.length > 0 &&
    !prodCodes.some((c) => candCodes.includes(c))
  ) {
    actions.push({
      platform: "android",
      action: "promote_release",
      reason: `Build ${candCodes.join(", ")} on "${androidCandidate.track}" is not in production yet`,
      confidence: "high",
      params: {
        fromTrack: androidCandidate.track,
        toTrack: prodTrack,
        versionCodes: candCodes,
      },
    });
  }

  if (
    production.android?.state === "inProgress" &&
    typeof production.android.rollout === "number" &&
    production.android.rollout < 1
  ) {
    actions.push({
      platform: "android",
      action: "configure_rollout",
      reason: `Production staged rollout at ${Math.round(production.android.rollout * 100)}%`,
      confidence: "medium",
      params: {
        track: prodTrack,
        currentFraction: production.android.rollout,
      },
    });
  }

  if (actions.length === 0) {
    actions.push({
      platform: "both",
      action: "monitor",
      reason: "No immediate release action detected — continue monitoring",
      confidence: "low",
    });
  }

  return actions;
}

export async function buildReleaseSnapshot(
  appleClient: AppleClient | undefined,
  googleClient: GooglePlayClient | undefined,
  options: {
    profile?: ProjectProfile;
    appleAppId?: string;
    googlePackageName?: string;
  },
): Promise<ReleaseSnapshot> {
  const profile = options.profile;
  const appleAppId =
    options.appleAppId ?? profile?.stores?.ios?.appId;
  const googlePackageName =
    options.googlePackageName ?? profile?.stores?.android?.package;

  const production: ReleaseSnapshot["production"] = {};
  const candidate: ReleaseSnapshot["candidate"] = {};
  let iosRows: IosVersionRow[] = [];

  if (appleClient && appleAppId) {
    const versionResponse = (await versions.listAppStoreVersions(
      appleClient,
      appleAppId,
      { platform: "IOS" },
    )) as { data: IosVersionRow[] };

    iosRows = versionResponse.data ?? [];

    // Enrich with build relationships for top versions
    const enriched = await Promise.all(
      iosRows.slice(0, 5).map(async (row) => {
        try {
          const detail = (await versions.getAppStoreVersion(
            appleClient,
            row.id,
          )) as { data: IosVersionRow };
          return detail.data ?? row;
        } catch {
          return row;
        }
      }),
    );

    production.ios = iosProductionFromVersions(enriched);
    candidate.ios = iosCandidateFromVersions(enriched);

    // Latest processing-complete build as fallback candidate hint
    if (!candidate.ios) {
      const buildList = (await builds.listBuilds(appleClient, appleAppId, {
        processingState: "VALID",
      })) as {
        data: Array<{ id: string; attributes: { version?: string } }>;
      };
      const latest = buildList.data?.[0];
      if (latest) {
        candidate.ios = {
          version: latest.attributes.version,
          buildId: latest.id,
          state: "BUILD_AVAILABLE",
        };
      }
    }
  }

  if (googleClient && googlePackageName) {
    const productionTrack = resolveAndroidTrack(
      profile,
      "production",
      "production",
    );
    const internalTrack = resolveAndroidTrack(profile, "internal", "internal");
    const closedTrack = resolveAndroidTrack(profile, "closed", "alpha");

    const trackList = await googleClient.withEdit(
      googlePackageName,
      async (editId) =>
        tracks.listTracks(googleClient, googlePackageName, editId),
    );

    const prodTrackData = await googleClient.withEdit(
      googlePackageName,
      async (editId) =>
        tracks.getTrack(
          googleClient,
          googlePackageName,
          editId,
          productionTrack,
        ),
    );

    production.android = androidProductionFromTrack(
      prodTrackData,
      productionTrack,
    );

    candidate.android = androidCandidateFromTracks(trackList, [
      internalTrack,
      closedTrack,
      "beta",
    ]);
  }

  const blockers = [
    ...deriveIosBlockers(candidate.ios),
    ...deriveAndroidBlockers(production.android, candidate.android),
  ];

  const nextActions = deriveNextActions(production, candidate, blockers);

  return {
    project: profile?.project,
    capturedAt: new Date().toISOString(),
    production,
    candidate,
    nextActions,
    blockers,
  };
}

export function explainBlockers(snapshot: ReleaseSnapshot): {
  summary: string;
  blockers: ReleaseBlocker[];
  nextActions: NextAction[];
  canProceedToProduction: boolean;
} {
  const errors = snapshot.blockers.filter((b) => b.severity === "error");
  const warnings = snapshot.blockers.filter((b) => b.severity === "warning");

  let summary: string;
  if (errors.length > 0) {
    summary = `${errors.length} blocking issue(s) prevent production release. ${warnings.length} warning(s).`;
  } else if (warnings.length > 0) {
    summary = `No hard blockers. ${warnings.length} warning(s) to review before proceeding.`;
  } else {
    summary = "No blockers detected. Check nextActions for recommended steps.";
  }

  return {
    summary,
    blockers: snapshot.blockers,
    nextActions: snapshot.nextActions,
    canProceedToProduction: errors.length === 0,
  };
}
