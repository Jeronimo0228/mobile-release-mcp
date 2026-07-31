import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./utils/config.js";
import { AppleClient } from "./providers/apple/client.js";
import { GooglePlayClient } from "./providers/google/client.js";
import { registerAppleTools } from "./tools/apple-tools.js";
import { registerGoogleTools } from "./tools/google-tools.js";
import { registerSharedTools } from "./tools/shared-tools.js";
import { createToolRegistrar } from "./utils/tool-registry.js";
import { logger } from "./utils/logger.js";

declare const __APP_VERSION__: string;

export function createMcpServer(config: Config): McpServer {
  const server = new McpServer({
    name: "mobile-release-mcp",
    version: __APP_VERSION__,
  });

  const tool = createToolRegistrar(server, config);

  let appleClient: AppleClient | undefined;
  let googleClient: GooglePlayClient | undefined;

  if (config.apple) {
    appleClient = new AppleClient(config.apple);
    registerAppleTools(tool, appleClient);
    logger.info("Apple App Store Connect tools registered");
  } else {
    logger.warn(
      "Apple configuration not found — iOS tools will not be available",
    );
  }

  if (config.google) {
    googleClient = new GooglePlayClient(config.google);
    registerGoogleTools(tool, googleClient);
    logger.info("Google Play Console tools registered");
  } else {
    logger.warn(
      "Google configuration not found — Android tools will not be available",
    );
  }

  registerSharedTools(tool, appleClient, googleClient, config);
  logger.info(`Shared tools registered (toolset: ${config.toolset})`);

  return server;
}
