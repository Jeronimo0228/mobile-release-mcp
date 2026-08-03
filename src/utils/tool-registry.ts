import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config, Toolset } from "./config.js";
import { ToolError, toolErrorResult, toolTextResult } from "./errors.js";

export type ToolCategory =
  | "read"
  | "release"
  | "metadata"
  | "admin"
  | "destructive";

export interface ToolOptions {
  categories?: ToolCategory[];
  destructive?: boolean;
}

const DESTRUCTIVE_TOOLS = new Set([
  "apple_submit_for_review",
  "apple_submit_for_beta_review",
  "apple_delete_in_app_purchase",
  "apple_remove_user",
  "apple_revoke_certificate",
  "apple_delete_profile",
  "apple_delete_review_response",
  "apple_disable_capability",
  "google_delete_all_images",
  "google_delete_in_app_product",
  "google_halt_release",
  "trigger_full_release",
  "promote_release",
  "configure_rollout",
  "google_upload_bundle",
  "google_upload_apk",
  "apple_set_content_rights",
  "apple_set_export_compliance",
  "apple_upload_screenshot",
  "apple_upload_screenshots",
]);

const RELEASE_TOOLS = new Set([
  "trigger_full_release",
  "get_release_status",
  "apple_create_app_version",
  "apple_assign_build_to_version",
  "apple_set_release_type",
  "apple_set_phased_release",
  "apple_submit_for_review",
  "apple_set_release_notes",
  "google_create_release",
  "google_promote_release",
  "google_set_rollout_fraction",
  "google_update_track",
  "google_set_release_notes",
  "google_commit_edit",
  "google_validate_edit",
  "google_create_edit",
  "get_release_snapshot",
  "explain_release_blockers",
  "load_project",
  "create_tester_group",
  "promote_release",
  "configure_rollout",
  "google_upload_bundle",
  "google_upload_apk",
  "apple_get_version_review_info",
  "apple_list_version_review_info",
  "apple_get_submission_readiness",
  "apple_get_content_rights",
  "apple_get_export_compliance",
  "apple_list_screenshot_sets",
  "apple_list_screenshots",
]);

function inferCategories(name: string): ToolCategory[] {
  if (
    name.startsWith("list_pending") ||
    name.startsWith("mark_webhook") ||
    name.startsWith("get_release")
  ) {
    return ["read", "release"];
  }

  if (
    name.includes("_list_") ||
    name.includes("_get_") ||
    name.startsWith("apple_list") ||
    name.startsWith("apple_get") ||
    name.startsWith("google_list") ||
    name.startsWith("google_get")
  ) {
    return ["read"];
  }

  if (RELEASE_TOOLS.has(name)) {
    return ["release"];
  }

  if (
    DESTRUCTIVE_TOOLS.has(name) ||
    name.includes("_delete_") ||
    name.includes("_remove_") ||
    name.includes("_revoke_")
  ) {
    return ["destructive"];
  }

  if (
    name.includes("_update_") ||
    name.includes("_set_") ||
    name.includes("_create_") ||
    name.includes("_add_") ||
    name.includes("_register_") ||
    name.includes("_enable_") ||
    name.includes("_respond_") ||
    name.includes("_reply_") ||
    name.includes("_invite_") ||
    name.includes("_assign_") ||
    name.includes("_upload_") ||
    name.includes("_promote_") ||
    name.includes("_halt_")
  ) {
    return ["admin"];
  }

  return ["metadata"];
}

function isToolEnabled(toolset: Toolset, categories: ToolCategory[]): boolean {
  switch (toolset) {
    case "all":
      return true;
    case "release":
      return categories.some((c) => ["read", "release"].includes(c));
    case "readonly":
      return categories.includes("read");
    default:
      return true;
  }
}

export interface ToolRegistrar {
  tool: (
    name: string,
    description: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (args: any) => Promise<{ content: Array<{ type: "text"; text: string }> }>,
    options?: ToolOptions,
  ) => void;
}

export function createToolRegistrar(
  server: McpServer,
  config: Config,
): ToolRegistrar {
  return {
    tool(name, description, schema, handler, options = {}) {
      const categories = options.categories ?? inferCategories(name);
      const destructive =
        options.destructive ??
        (DESTRUCTIVE_TOOLS.has(name) || categories.includes("destructive"));

      if (!isToolEnabled(config.toolset, categories)) {
        return;
      }

      const finalSchema = destructive
        ? {
            ...schema,
            confirm: z
              .literal(true)
              .describe(
                "Must be true to confirm this action. Destructive or irreversible store operations require explicit confirmation.",
              ),
          }
        : schema;

      server.tool(name, description, finalSchema, async (args) => {
        try {
          const dryRun = args.dryRun === true;
          if (destructive && args.confirm !== true && !dryRun) {
            throw new ToolError(
              `Tool "${name}" requires confirm: true when dryRun is false`,
              "CONFIRMATION_REQUIRED",
              false,
              "Run with dryRun: true to preview, then dryRun: false and confirm: true to execute.",
            );
          }

          const { confirm: _confirm, ...rest } = args;
          return await handler(rest);
        } catch (err) {
          return toolErrorResult(err);
        }
      });
    },
  };
}

export function toolSuccess(data: unknown) {
  return toolTextResult({ success: true, data });
}
