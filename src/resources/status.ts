import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadProjectMemory, loadProjectProfile } from "../core/project-profile.js";
import { getWebhookEvents } from "../webhook/handler.js";

export function registerResources(server: McpServer) {
  server.resource(
    "webhook-events",
    "webhook://events",
    {
      description: "Recent webhook events received from EAS and GitHub Actions",
      mimeType: "application/json",
    },
    async () => {
      const events = getWebhookEvents();
      return {
        contents: [
          {
            uri: "webhook://events",
            mimeType: "application/json",
            text: JSON.stringify(events, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    "pending-actions",
    "webhook://pending",
    {
      description: "Webhook events that have not been processed yet",
      mimeType: "application/json",
    },
    async () => {
      const events = getWebhookEvents(true);
      return {
        contents: [
          {
            uri: "webhook://pending",
            mimeType: "application/json",
            text: JSON.stringify(events, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    "project-memory",
    "project://memory",
    {
      description:
        "StorePilot project profile and release memory from storepilot.yaml and .storepilot/memory.json",
      mimeType: "application/json",
    },
    async () => {
      const profile = loadProjectProfile();
      const payload = profile
        ? { profile, memory: loadProjectMemory(profile) }
        : { loaded: false, message: "No storepilot.yaml in workspace" };

      return {
        contents: [
          {
            uri: "project://memory",
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  );
}
