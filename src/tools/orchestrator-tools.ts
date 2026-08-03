import { z } from "zod";
import type { ToolRegistrar } from "../utils/tool-registry.js";
import type { Config } from "../utils/config.js";
import type { AppleClient } from "../providers/apple/client.js";
import type { GooglePlayClient } from "../providers/google/client.js";
import { toolSuccess } from "../utils/tool-registry.js";
import {
  loadProjectMemory,
  loadProjectProfile,
  resolveStoreIds,
} from "../core/project-profile.js";
import {
  buildReleaseSnapshot,
  explainBlockers,
} from "../core/release-snapshot.js";
import {
  executeConfigureRollout,
  executeCreateTesterGroup,
  executePromoteRelease,
  planConfigureRollout,
  planCreateTesterGroup,
  planPromoteRelease,
} from "../core/release-workflows.js";

const testerTypeSchema = z
  .enum(["internal", "closed", "open"])
  .describe("Tester group type: internal employees, closed external, or open beta");

const dryRunSchema = z
  .boolean()
  .default(true)
  .describe(
    "When true (default), returns the execution plan without changing stores. Set false with confirm: true to execute.",
  );

function resolveProfile(config: Config, configPath?: string) {
  return (
    config.projectProfile ??
    loadProjectProfile(configPath ?? process.env.STOREPILOT_CONFIG_PATH)
  );
}

export function registerOrchestratorTools(
  tool: ToolRegistrar,
  appleClient: AppleClient | undefined,
  googleClient: GooglePlayClient | undefined,
  config: Config,
) {
  tool.tool(
    "load_project",
    "Load storepilot.yaml project profile and persisted release memory from .storepilot/memory.json",
    {
      configPath: z
        .string()
        .optional()
        .describe("Path to storepilot.yaml (auto-discovered from cwd if omitted)"),
    },
    async ({ configPath }) => {
      const profile = loadProjectProfile(configPath);
      if (!profile) {
        return toolSuccess({
          loaded: false,
          message:
            "No storepilot.yaml found. Copy storepilot.example.yaml and set stores.ios.appId / stores.android.package.",
        });
      }
      const memory = loadProjectMemory(profile);
      return toolSuccess({ loaded: true, profile, memory });
    },
    { categories: ["read", "release"] },
  );

  tool.tool(
    "get_release_snapshot",
    "Unified release snapshot: production vs candidate versions, blockers, and recommended next actions. Uses storepilot.yaml defaults when IDs are omitted.",
    {
      appleAppId: z.string().optional().describe("Override Apple app ID"),
      googlePackageName: z
        .string()
        .optional()
        .describe("Override Android package name"),
      configPath: z.string().optional().describe("Path to storepilot.yaml"),
    },
    async ({ appleAppId, googlePackageName, configPath }) => {
      const profile = resolveProfile(config, configPath);
      const ids = resolveStoreIds(profile, { appleAppId, googlePackageName });

      const snapshot = await buildReleaseSnapshot(
        appleClient,
        googleClient,
        {
          profile,
          appleAppId: ids.appleAppId,
          googlePackageName: ids.googlePackageName,
        },
      );

      return toolSuccess(snapshot);
    },
    { categories: ["read", "release"] },
  );

  tool.tool(
    "explain_release_blockers",
    "Explain why a release may be blocked and what to do next. Wraps get_release_snapshot with human-readable guidance.",
    {
      appleAppId: z.string().optional(),
      googlePackageName: z.string().optional(),
      configPath: z.string().optional(),
    },
    async ({ appleAppId, googlePackageName, configPath }) => {
      const profile = resolveProfile(config, configPath);
      const ids = resolveStoreIds(profile, { appleAppId, googlePackageName });

      const snapshot = await buildReleaseSnapshot(
        appleClient,
        googleClient,
        {
          profile,
          appleAppId: ids.appleAppId,
          googlePackageName: ids.googlePackageName,
        },
      );

      return toolSuccess(explainBlockers(snapshot));
    },
    { categories: ["read", "release"] },
  );

  tool.tool(
    "create_tester_group",
    "Create a TestFlight beta group (iOS) and/or configure Google Play track testers. dryRun defaults to true.",
    {
      platform: z
        .enum(["ios", "android", "both"])
        .describe("Target platform(s)"),
      name: z.string().describe("Group name (TestFlight) or label for the operation"),
      type: testerTypeSchema,
      testers: z
        .array(
          z.object({
            email: z.string().email(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
          }),
        )
        .optional()
        .describe("iOS testers to invite by email"),
      googleGroups: z
        .array(z.string())
        .optional()
        .describe("Google Group emails for Android track testers"),
      appleAppId: z.string().optional(),
      googlePackageName: z.string().optional(),
      configPath: z.string().optional(),
      dryRun: dryRunSchema,
    },
    async (args) => {
      const profile = resolveProfile(config, args.configPath);
      if (args.dryRun) {
        const plan = await planCreateTesterGroup(
          appleClient,
          googleClient,
          profile,
          args,
        );
        return toolSuccess({ dryRun: true, plan });
      }

      const result = await executeCreateTesterGroup(
        appleClient,
        googleClient,
        profile,
        args,
      );
      return toolSuccess({ dryRun: false, ...result });
    },
    { categories: ["release"] },
  );

  tool.tool(
    "promote_release",
    "Promote a release: Android track-to-track promotion, or iOS submit for review / TestFlight beta review. dryRun defaults to true.",
    {
      platform: z.enum(["ios", "android"]),
      fromTrack: z.string().optional().describe("Android source track"),
      toTrack: z.string().optional().describe("Android destination track"),
      userFraction: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Staged rollout 0–1 when promoting to production"),
      buildId: z.string().optional().describe("iOS TestFlight build ID"),
      versionId: z.string().optional().describe("iOS App Store version ID"),
      releaseNotes: z
        .array(z.object({ language: z.string(), text: z.string() }))
        .optional(),
      appleAppId: z.string().optional(),
      googlePackageName: z.string().optional(),
      configPath: z.string().optional(),
      dryRun: dryRunSchema,
    },
    async (args) => {
      const profile = resolveProfile(config, args.configPath);
      if (args.dryRun) {
        const plan = await planPromoteRelease(
          appleClient,
          googleClient,
          profile,
          args,
        );
        return toolSuccess({ dryRun: true, plan });
      }

      const result = await executePromoteRelease(
        appleClient,
        googleClient,
        profile,
        args,
      );
      return toolSuccess({ dryRun: false, ...result });
    },
    { categories: ["release", "destructive"], destructive: true },
  );

  tool.tool(
    "configure_rollout",
    "Configure staged rollout: Android userFraction or iOS phased release. dryRun defaults to true.",
    {
      platform: z.enum(["ios", "android"]),
      percentage: z
        .number()
        .min(0)
        .max(100)
        .describe("Rollout percentage 0–100"),
      versionId: z.string().optional().describe("iOS App Store version ID"),
      track: z.string().optional().describe("Android track (default: production)"),
      googlePackageName: z.string().optional(),
      configPath: z.string().optional(),
      dryRun: dryRunSchema,
    },
    async (args) => {
      const profile = resolveProfile(config, args.configPath);
      if (args.dryRun) {
        const plan = await planConfigureRollout(
          appleClient,
          googleClient,
          profile,
          args,
        );
        return toolSuccess({ dryRun: true, plan });
      }

      const result = await executeConfigureRollout(
        appleClient,
        googleClient,
        profile,
        args,
      );
      return toolSuccess({ dryRun: false, ...result });
    },
    { categories: ["release", "destructive"], destructive: true },
  );
}
