import { readFileSync } from "node:fs";
import { logger } from "./logger.js";

export type Toolset = "all" | "release" | "readonly";
export type TransportMode = "stdio" | "http";

export interface AppleConfig {
  keyId: string;
  issuerId: string;
  privateKey: string;
}

export interface GoogleConfig {
  serviceAccountKey: Record<string, unknown>;
}

export interface WebhookConfig {
  port: number;
  easSecret?: string;
  githubSecret?: string;
  storagePath: string;
  requireSecrets: boolean;
}

export interface EasProjectMapping {
  projectName: string;
  iosAppId?: string;
  androidPackageName?: string;
}

export interface Config {
  apple?: AppleConfig;
  google?: GoogleConfig;
  webhook: WebhookConfig;
  transport: TransportMode;
  mcpPort: number;
  toolset: Toolset;
  easProjectMappings: EasProjectMapping[];
}

export interface ConfigValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

function loadAppleConfig(): AppleConfig | undefined {
  const keyId = process.env.APPLE_KEY_ID;
  const issuerId = process.env.APPLE_ISSUER_ID;

  if (!keyId || !issuerId) return undefined;

  let privateKey: string | undefined;

  if (process.env.APPLE_PRIVATE_KEY_BASE64) {
    privateKey = Buffer.from(
      process.env.APPLE_PRIVATE_KEY_BASE64,
      "base64",
    ).toString("utf-8");
  } else if (process.env.APPLE_PRIVATE_KEY_PATH) {
    privateKey = readFileSync(process.env.APPLE_PRIVATE_KEY_PATH, "utf-8");
  }

  if (!privateKey) return undefined;

  return { keyId, issuerId, privateKey };
}

function loadGoogleConfig(): GoogleConfig | undefined {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return {
      serviceAccountKey: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    };
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    const raw = readFileSync(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      "utf-8",
    );
    return { serviceAccountKey: JSON.parse(raw) };
  }

  return undefined;
}

function parseToolset(value: string | undefined): Toolset {
  if (value === "release" || value === "readonly") return value;
  return "all";
}

function parseEasProjectMappings(): EasProjectMapping[] {
  const raw = process.env.EAS_PROJECT_MAPPINGS;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as EasProjectMapping[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    logger.warn("EAS_PROJECT_MAPPINGS is not valid JSON — ignoring");
    return [];
  }
}

export function loadConfig(): Config {
  const transport = (process.env.MCP_TRANSPORT as TransportMode) || "stdio";
  const webhookPort = parseInt(process.env.WEBHOOK_PORT || "3000", 10);
  const mcpPort = parseInt(process.env.MCP_PORT || String(webhookPort), 10);
  const requireWebhookSecrets =
    process.env.WEBHOOK_REQUIRE_SECRETS !== "false";

  return {
    apple: loadAppleConfig(),
    google: loadGoogleConfig(),
    webhook: {
      port: webhookPort,
      easSecret: process.env.EAS_WEBHOOK_SECRET,
      githubSecret: process.env.GITHUB_WEBHOOK_SECRET,
      storagePath:
        process.env.WEBHOOK_STORAGE_PATH ||
        process.env.WEBHOOK_STORAGE ||
        ".data/webhooks.json",
      requireSecrets: requireWebhookSecrets,
    },
    transport,
    mcpPort,
    toolset: parseToolset(process.env.MCP_TOOLSET),
    easProjectMappings: parseEasProjectMappings(),
  };
}

export function validateConfig(config: Config): ConfigValidation {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!config.apple && !config.google) {
    errors.push(
      "No store credentials configured. Set Apple (APPLE_KEY_ID, APPLE_ISSUER_ID, APPLE_PRIVATE_KEY_PATH) and/or Google (GOOGLE_SERVICE_ACCOUNT_KEY_PATH) variables. See docs/CREDENTIALS.md.",
    );
  } else {
    if (!config.apple) {
      warnings.push(
        "Apple credentials missing — iOS tools will not be registered.",
      );
    }
    if (!config.google) {
      warnings.push(
        "Google credentials missing — Android tools will not be registered.",
      );
    }
  }

  const webhooksEnabled =
    config.transport === "http" ||
    Boolean(config.webhook.easSecret || config.webhook.githubSecret);

  if (webhooksEnabled && config.webhook.requireSecrets) {
    if (!config.webhook.easSecret) {
      errors.push(
        "EAS_WEBHOOK_SECRET is required when webhooks are enabled. Set the secret or WEBHOOK_REQUIRE_SECRETS=false for local development only.",
      );
    }
    if (!config.webhook.githubSecret) {
      errors.push(
        "GITHUB_WEBHOOK_SECRET is required when webhooks are enabled. Set the secret or WEBHOOK_REQUIRE_SECRETS=false for local development only.",
      );
    }
  }

  if (config.transport === "http" && config.mcpPort < 1) {
    errors.push("MCP_PORT must be a positive integer.");
  }

  if (config.toolset !== "all") {
    warnings.push(
      `MCP_TOOLSET=${config.toolset} — only a subset of tools is registered.`,
    );
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

export function logConfigValidation(validation: ConfigValidation): void {
  for (const warning of validation.warnings) {
    logger.warn(warning);
  }
  for (const error of validation.errors) {
    logger.error(error);
  }
}
