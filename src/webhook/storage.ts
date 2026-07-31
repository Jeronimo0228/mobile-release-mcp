import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { WebhookEvent } from "./handler.js";
import { logger } from "../utils/logger.js";

interface StoredWebhookState {
  eventCounter: number;
  events: WebhookEvent[];
}

export class WebhookStorage {
  private path: string;
  private state: StoredWebhookState;

  constructor(path: string) {
    this.path = path;
    this.state = this.load();
  }

  private load(): StoredWebhookState {
    if (!existsSync(this.path)) {
      return { eventCounter: 0, events: [] };
    }

    try {
      const raw = readFileSync(this.path, "utf-8");
      const parsed = JSON.parse(raw) as StoredWebhookState;
      return {
        eventCounter: parsed.eventCounter ?? 0,
        events: parsed.events ?? [],
      };
    } catch (err) {
      logger.warn(`Could not load webhook storage at ${this.path}`, err);
      return { eventCounter: 0, events: [] };
    }
  }

  private persist(): void {
    const dir = dirname(this.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.path, JSON.stringify(this.state, null, 2), "utf-8");
  }

  getEvents(onlyUnprocessed = false): WebhookEvent[] {
    if (onlyUnprocessed) {
      return this.state.events.filter((event) => !event.processed);
    }
    return [...this.state.events];
  }

  markProcessed(eventId: string): boolean {
    const event = this.state.events.find((item) => item.id === eventId);
    if (!event) return false;
    event.processed = true;
    this.persist();
    return true;
  }

  storeEvent(
    event: Omit<WebhookEvent, "id" | "receivedAt" | "processed">,
  ): WebhookEvent {
    const id = `evt_${++this.state.eventCounter}_${Date.now()}`;
    const webhookEvent: WebhookEvent = {
      ...event,
      id,
      receivedAt: new Date().toISOString(),
      processed: false,
    };

    this.state.events.push(webhookEvent);

    if (this.state.events.length > 1000) {
      this.state.events.splice(0, this.state.events.length - 1000);
      logger.warn("Webhook queue exceeded 1000 events — oldest events were trimmed");
    }

    this.persist();
    return webhookEvent;
  }
}

let storageInstance: WebhookStorage | undefined;

export function initWebhookStorage(path: string): WebhookStorage {
  storageInstance = new WebhookStorage(path);
  return storageInstance;
}

export function getWebhookStorage(): WebhookStorage {
  if (!storageInstance) {
    storageInstance = new WebhookStorage(".data/webhooks.json");
  }
  return storageInstance;
}
