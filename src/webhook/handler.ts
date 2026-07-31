import { Hono } from "hono";
import type { WebhookConfig, EasProjectMapping } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { parseEasWebhook, type EasWebhookPayload } from "./eas.js";
import {
  parseGitHubWebhook,
  type GitHubWorkflowRunPayload,
} from "./github.js";
import { getWebhookStorage, initWebhookStorage } from "./storage.js";

export interface WebhookEvent {
  id: string;
  source: "eas" | "github";
  receivedAt: string;
  eventType: string;
  platform?: "ios" | "android";
  status: string;
  payload: EasWebhookPayload | GitHubWorkflowRunPayload;
  processed: boolean;
  mappedTargets?: {
    appleAppId?: string;
    googlePackageName?: string;
  };
}

export function getWebhookEvents(onlyUnprocessed = false): WebhookEvent[] {
  return getWebhookStorage().getEvents(onlyUnprocessed);
}

export function markEventProcessed(eventId: string): boolean {
  return getWebhookStorage().markProcessed(eventId);
}

function resolveEasMapping(
  payload: EasWebhookPayload,
  mappings: EasProjectMapping[],
): WebhookEvent["mappedTargets"] {
  const mapping = mappings.find(
    (item) => item.projectName === payload.projectName,
  );
  if (!mapping) return undefined;

  return {
    appleAppId: mapping.iosAppId,
    googlePackageName: mapping.androidPackageName,
  };
}

function storeEvent(
  event: Omit<WebhookEvent, "id" | "receivedAt" | "processed">,
) {
  return getWebhookStorage().storeEvent(event);
}

export function createWebhookApp(
  config: WebhookConfig,
  easProjectMappings: EasProjectMapping[] = [],
) {
  initWebhookStorage(config.storagePath);

  const app = new Hono();

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      webhooks: {
        storagePath: config.storagePath,
        pending: getWebhookEvents(true).length,
      },
    }),
  );

  app.post("/webhook/eas", async (c) => {
    try {
      if (config.requireSecrets && !config.easSecret) {
        return c.json({ error: "EAS webhooks are not configured" }, 503);
      }

      const rawBody = await c.req.text();
      const signature = c.req.header("Expo-Signature") || null;

      const { event, payload } = parseEasWebhook(
        rawBody,
        signature,
        config.easSecret,
      );

      const stored = storeEvent({
        source: "eas",
        eventType: event,
        platform: payload.platform,
        status: payload.status,
        payload,
        mappedTargets: resolveEasMapping(payload, easProjectMappings),
      });

      logger.info(`Stored EAS webhook event: ${stored.id}`);
      return c.json({ received: true, eventId: stored.id });
    } catch (err) {
      logger.error("EAS webhook error", err);
      return c.json({ error: "Invalid webhook" }, 400);
    }
  });

  app.post("/webhook/github", async (c) => {
    try {
      if (config.requireSecrets && !config.githubSecret) {
        return c.json({ error: "GitHub webhooks are not configured" }, 503);
      }

      const rawBody = await c.req.text();
      const signature = c.req.header("X-Hub-Signature-256") || null;
      const eventType = c.req.header("X-GitHub-Event") || null;

      const payload = parseGitHubWebhook(
        rawBody,
        signature,
        eventType,
        config.githubSecret,
      );

      if (!payload) {
        return c.json({ received: true, ignored: true });
      }

      const stored = storeEvent({
        source: "github",
        eventType: `workflow_run.${payload.action}`,
        status: payload.workflow_run.conclusion || "unknown",
        payload,
      });

      logger.info(`Stored GitHub webhook event: ${stored.id}`);
      return c.json({ received: true, eventId: stored.id });
    } catch (err) {
      logger.error("GitHub webhook error", err);
      return c.json({ error: "Invalid webhook" }, 400);
    }
  });

  return app;
}
