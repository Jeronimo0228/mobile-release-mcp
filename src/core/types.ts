export interface StorePilotIosConfig {
  appId: string;
  bundleId?: string;
}

export interface StorePilotAndroidConfig {
  package: string;
}

export interface StorePilotTracksConfig {
  internal?: string;
  closed?: string;
  open?: string;
  production?: string;
}

export interface StorePilotReleaseConfig {
  tracks?: StorePilotTracksConfig;
  defaultRollout?: number;
}

export interface StorePilotBuildConfig {
  provider?: "eas" | "github" | "bitrise" | "codemagic" | "jenkins" | string;
  projectId?: string;
}

export interface ProjectProfile {
  project: string;
  name?: string;
  stores?: {
    ios?: StorePilotIosConfig;
    android?: StorePilotAndroidConfig;
  };
  build?: StorePilotBuildConfig;
  release?: StorePilotReleaseConfig;
  locales?: string[];
  /** Absolute path to the loaded config file */
  configPath?: string;
  /** Directory for .storepilot/ memory (parent of config file or cwd) */
  projectDir?: string;
}

export interface ProductionReleaseInfo {
  version?: string;
  versionId?: string;
  buildId?: string;
  state?: string;
  rollout?: string | number;
  versionCodes?: string[];
  track?: string;
}

export interface CandidateReleaseInfo {
  version?: string;
  versionId?: string;
  buildId?: string;
  state?: string;
  track?: string;
  versionCodes?: string[];
  blockers?: ReleaseBlocker[];
}

export interface ReleaseBlocker {
  platform: "ios" | "android" | "both";
  code: string;
  message: string;
  severity: "error" | "warning";
  suggestion?: string;
}

export interface NextAction {
  platform: "ios" | "android" | "both";
  action: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  params?: Record<string, unknown>;
}

export interface ReleaseSnapshot {
  project?: string;
  capturedAt: string;
  production: {
    ios?: ProductionReleaseInfo;
    android?: ProductionReleaseInfo;
  };
  candidate: {
    ios?: CandidateReleaseInfo;
    android?: CandidateReleaseInfo;
  };
  nextActions: NextAction[];
  blockers: ReleaseBlocker[];
}

export interface ProjectMemoryEntry {
  at: string;
  action: string;
  platform?: "ios" | "android" | "both";
  version?: string;
  result: "success" | "failure" | "dry_run";
  details?: string;
}

export interface ProjectMemory {
  projectId: string;
  lastUpdated: string;
  resolved: {
    lastProductionIos?: { version?: string; buildId?: string; versionId?: string };
    lastProductionAndroid?: { versionCode?: string; track?: string };
  };
  history: ProjectMemoryEntry[];
}
