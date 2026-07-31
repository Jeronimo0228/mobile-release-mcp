import { serve } from "@hono/node-server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  loadConfig,
  validateConfig,
  logConfigValidation,
} from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { createMcpServer } from "./server.js";
import { registerResources } from "./resources/status.js";
import { createHttpApp } from "./http/app.js";
import { createWebhookApp } from "./webhook/handler.js";

async function main() {
  const config = loadConfig();
  const validation = validateConfig(config);
  logConfigValidation(validation);

  if (!validation.valid) {
    throw new Error(
      `Configuration invalid:\n${validation.errors.map((e) => `- ${e}`).join("\n")}`,
    );
  }

  const mcpServer = createMcpServer(config);
  registerResources(mcpServer);

  if (config.transport === "http") {
    const app = createHttpApp(config, mcpServer);
    serve({
      fetch: app.fetch,
      port: config.mcpPort,
    });
    logger.info(
      `HTTP server listening on port ${config.mcpPort} (MCP: /mcp, webhooks: /webhook/*)`,
    );
    return;
  }

  const webhooksConfigured =
    config.webhook.easSecret && config.webhook.githubSecret;

  if (webhooksConfigured) {
    const webhookApp = createWebhookApp(
      config.webhook,
      config.easProjectMappings,
    );
    serve({
      fetch: webhookApp.fetch,
      port: config.webhook.port,
    });
    logger.info(`Webhook server listening on port ${config.webhook.port}`);
  } else if (!config.webhook.requireSecrets) {
    logger.warn(
      "Webhook secrets not configured — webhook server not started. Configure EAS_WEBHOOK_SECRET and GITHUB_WEBHOOK_SECRET to enable.",
    );
  }

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  logger.info(
    `MCP server running on stdio transport (toolset: ${config.toolset})`,
  );
}

main().catch((err) => {
  logger.error("Fatal error", err);
  process.exit(1);
});
