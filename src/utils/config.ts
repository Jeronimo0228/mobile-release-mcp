import { readFileSync } from "node:fs";
import { loadProjectProfile } from "../core/project-profile.js";
import type { ProjectProfile } from "../core/types.js";
import { logger } from "./logger.js";
import { resolveSafeStoragePath, safeJsonParse } from "./security.js";

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
  mcpHttpApiKey?: string;
  mcpAllowedOrigins: string[];
  toolset: Toolset;
  easProjectMappings: EasProjectMapping[];
  projectProfile?: ProjectProfile;
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
      serviceAccountKey: safeJsonParse<Record<string, unknown>>(
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        "GOOGLE_SERVICE_ACCOUNT_JSON",
      ),
    };
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    const raw = readFileSync(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      "utf-8",
    );
    return {
      serviceAccountKey: safeJsonParse<Record<string, unknown>>(
        raw,
        "GOOGLE_SERVICE_ACCOUNT_KEY_PATH",
      ),
    };
  }

  return undefined;
}

function parseToolset(value: string | undefined): Toolset {
  if (value === "release" || value === "readonly") return value;
  return "all";
}

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseEasProjectMappings(): EasProjectMapping[] {
  const raw = process.env.EAS_PROJECT_MAPPINGS;
  if (!raw) return [];

  try {
    const parsed = safeJsonParse<EasProjectMapping[]>(raw, "EAS_PROJECT_MAPPINGS");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    logger.warn("EAS_PROJECT_MAPPINGS is not valid JSON — ignoring");
    return [];
  }
}

function loadStoragePath(): string {
  const configured =
    process.env.WEBHOOK_STORAGE_PATH ||
    process.env.WEBHOOK_STORAGE ||
    ".data/webhooks.json";

  return resolveSafeStoragePath(configured);
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
      storagePath: loadStoragePath(),
      requireSecrets: requireWebhookSecrets,
    },
    transport,
    mcpPort,
    mcpHttpApiKey: process.env.MCP_HTTP_API_KEY,
    mcpAllowedOrigins: parseAllowedOrigins(process.env.MCP_ALLOWED_ORIGINS),
    toolset: parseToolset(process.env.MCP_TOOLSET),
    easProjectMappings: parseEasProjectMappings(),
    projectProfile: loadProjectProfileSafe(),
  };
}

function loadProjectProfileSafe(): ProjectProfile | undefined {
  try {
    return loadProjectProfile();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`StorePilot config not loaded: ${message}`);
    return undefined;
  }
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

  if (config.transport === "http") {
    if (config.mcpPort < 1) {
      errors.push("MCP_PORT must be a positive integer.");
    }
    if (!config.mcpHttpApiKey) {
      errors.push(
        "MCP_HTTP_API_KEY is required in HTTP mode to protect the /mcp endpoint.",
      );
    } else if (config.mcpHttpApiKey.length < 32) {
      errors.push("MCP_HTTP_API_KEY must be at least 32 characters.");
    }
  }

  if (config.toolset !== "all") {
    warnings.push(
      `MCP_TOOLSET=${config.toolset} — only a subset of tools is registered.`,
    );
  }

  if (config.projectProfile) {
    warnings.push(
      `StorePilot project loaded: ${config.projectProfile.project} (${config.projectProfile.configPath})`,
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
