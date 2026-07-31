import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { secureCompare } from "../utils/security.js";
import { createWebhookApp } from "../webhook/handler.js";

export function createHttpApp(config: Config, mcpServer: McpServer): Hono {
  const app = new Hono();

  if (config.mcpAllowedOrigins.length > 0) {
    app.use(
      "*",
      cors({
        origin: config.mcpAllowedOrigins,
        allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "mcp-session-id",
          "Last-Event-ID",
          "mcp-protocol-version",
        ],
        exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
      }),
    );
  }

  const webhookApp = createWebhookApp(
    config.webhook,
    config.easProjectMappings,
  );

  app.route("/", webhookApp);

  app.use("/mcp", async (c, next) => {
    const apiKey = config.mcpHttpApiKey;
    if (!apiKey) {
      return c.json({ error: "MCP HTTP API key is not configured" }, 503);
    }

    const auth = c.req.header("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = auth.slice("Bearer ".length);
    if (!secureCompare(token, apiKey)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  });

  app.all("/mcp", async (c) => {
    const transport = new WebStandardStreamableHTTPServerTransport();
    const server = mcpServer;
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });

  logger.info(`MCP HTTP endpoint available at /mcp on port ${config.mcpPort}`);

  return app;
}
