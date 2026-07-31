import { z } from "zod";
import type { ToolRegistrar } from "../utils/tool-registry.js";
import type { Config } from "../utils/config.js";
import type { AppleClient } from "../providers/apple/client.js";
import type { GooglePlayClient } from "../providers/google/client.js";
import { getWebhookEvents, markEventProcessed } from "../webhook/handler.js";
import * as appleSubmissions from "../providers/apple/submissions.js";
import * as appleVersions from "../providers/apple/versions.js";
import * as appleMetadata from "../providers/apple/metadata.js";
import * as googleTracks from "../providers/google/tracks.js";
import * as googleReleases from "../providers/google/releases.js";
import { toolSuccess } from "../utils/tool-registry.js";

export function registerSharedTools(
  tool: ToolRegistrar,
  appleClient: AppleClient | undefined,
  googleClient: GooglePlayClient | undefined,
  _config: Config,
) {
  tool.tool(
    "list_pending_webhooks",
    "List webhook events received from EAS or GitHub Actions. Events include optional mappedTargets when EAS_PROJECT_MAPPINGS is configured.",
    {
      source: z
        .enum(["eas", "github", "all"])
        .default("all")
        .describe("Filter by webhook source"),
      onlyUnprocessed: z
        .boolean()
        .default(true)
        .describe("Only show unprocessed events"),
    },
    async ({ source, onlyUnprocessed }) => {
      let events = getWebhookEvents(onlyUnprocessed);
      if (source !== "all") {
        events = events.filter((e) => e.source === source);
      }
      return toolSuccess(events);
    },
    { categories: ["read", "release"] },
  );

  tool.tool(
    "mark_webhook_processed",
    "Mark a webhook event as processed after the agent has acted on it",
    {
      eventId: z.string().describe("The webhook event ID to mark as processed"),
    },
    async ({ eventId }) => {
      const success = markEventProcessed(eventId);
      return toolSuccess({
        eventId,
        processed: success,
        message: success
          ? `Event ${eventId} marked as processed`
          : `Event ${eventId} not found`,
      });
    },
    { categories: ["release"] },
  );

  tool.tool(
    "get_release_status",
    "Get a unified read-only view of release status across App Store and Google Play. Google Play reads use a temporary edit that is discarded automatically.",
    {
      appleAppId: z
        .string()
        .optional()
        .describe("Apple App Store Connect app ID"),
      appleVersionId: z
        .string()
        .optional()
        .describe("Apple App Store version ID"),
      googlePackageName: z
        .string()
        .optional()
        .describe("Android package name"),
      googleTrack: z
        .string()
        .optional()
        .describe("Google Play track to check"),
    },
    async ({
      appleAppId,
      appleVersionId,
      googlePackageName,
      googleTrack,
    }) => {
      const status: Record<string, unknown> = {};

      if (appleClient && appleVersionId) {
        status.ios = await appleSubmissions.getReviewStatus(
          appleClient,
          appleVersionId,
        );
      } else if (appleClient && appleAppId) {
        const versions = await appleVersions.listAppStoreVersions(
          appleClient,
          appleAppId,
        );
        const data = (
          versions as {
            data: Array<{
              id: string;
              attributes: {
                versionString: string;
                appStoreState: string;
              };
            }>;
          }
        ).data;

        status.ios = data?.slice(0, 3).map((v) => ({
          versionId: v.id,
          version: v.attributes.versionString,
          state: v.attributes.appStoreState,
        }));
      }

      if (googleClient && googlePackageName) {
        const trackName = googleTrack || "production";
        const trackData = await googleClient.withEdit(
          googlePackageName,
          async (editId) =>
            googleTracks.getTrack(
              googleClient,
              googlePackageName,
              editId,
              trackName,
            ),
        );

        status.android = {
          track: trackName,
          releases: trackData.releases?.map((r) => ({
            status: r.status,
            versionCodes: r.versionCodes,
            name: r.name,
            userFraction: r.userFraction,
          })),
        };
      }

      return toolSuccess(status);
    },
    { categories: ["read", "release"] },
  );

  tool.tool(
    "trigger_full_release",
    "Execute a full release flow on one or both platforms: create version/track release, set release notes, and submit for review. Requires confirm: true.",
    {
      platforms: z
        .array(z.enum(["ios", "android"]))
        .describe("Platforms to release on"),
      ios: z
        .object({
          appId: z.string(),
          buildId: z.string(),
          versionString: z.string(),
          releaseNotes: z.array(
            z.object({
              locale: z.string(),
              whatsNew: z.string(),
            }),
          ),
        })
        .optional()
        .describe("iOS release configuration"),
      android: z
        .object({
          packageName: z.string(),
          versionCodes: z.array(z.string()),
          track: z.string().default("production"),
          status: z
            .enum(["draft", "inProgress", "halted", "completed"])
            .default("completed"),
          releaseNotes: z
            .array(
              z.object({
                language: z.string(),
                text: z.string(),
              }),
            )
            .optional(),
          userFraction: z.number().min(0).max(1).optional(),
          releaseName: z.string().optional(),
        })
        .optional()
        .describe("Android release configuration"),
    },
    async ({ platforms, ios, android }) => {
      const results: Record<string, unknown> = {};

      if (platforms.includes("ios") && ios && appleClient) {
        const version = (await appleVersions.createAppStoreVersion(
          appleClient,
          ios.appId,
          ios.versionString,
        )) as { data: { id: string } };

        const versionId = version.data.id;

        await appleVersions.assignBuildToVersion(
          appleClient,
          versionId,
          ios.buildId,
        );

        if (ios.releaseNotes?.length) {
          await appleMetadata.setReleaseNotes(
            appleClient,
            versionId,
            ios.releaseNotes,
          );
        }

        const submission = await appleSubmissions.submitForReview(
          appleClient,
          versionId,
        );

        results.ios = {
          success: true,
          versionId,
          versionString: ios.versionString,
          submission,
        };
      }

      if (platforms.includes("android") && android && googleClient) {
        const releaseResult = await googleReleases.createRelease(
          googleClient,
          android.packageName,
          android.track,
          android.versionCodes,
          android.status,
          {
            releaseName: android.releaseName,
            releaseNotes: android.releaseNotes,
            userFraction: android.userFraction,
          },
        );

        results.android = {
          success: true,
          ...releaseResult,
        };
      }

      return toolSuccess(results);
    },
    { categories: ["release", "destructive"], destructive: true },
  );
}
