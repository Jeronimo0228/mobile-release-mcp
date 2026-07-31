import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../utils/logger.js";

export interface GitHubWorkflowRunPayload {
  action: "completed" | "requested" | "in_progress";
  workflow_run: {
    id: number;
    name: string;
    head_branch: string;
    head_sha: string;
    status: string;
    conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
    html_url: string;
    created_at: string;
    updated_at: string;
    run_number: number;
    workflow_id: number;
    artifacts_url: string;
    repository: {
      full_name: string;
    };
  };
  repository: {
    full_name: string;
    html_url: string;
  };
}

export function verifyGitHubSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  const expectedSignature = createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const sig = signature.replace("sha256=", "");
  const sigBuffer = Buffer.from(sig, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(sigBuffer, expectedBuffer);
}

export function parseGitHubWebhook(
  rawBody: string,
  signature: string | null,
  eventType: string | null,
  secret?: string,
): GitHubWorkflowRunPayload | null {
  if (secret && !verifyGitHubSignature(rawBody, signature, secret)) {
    throw new Error("Invalid GitHub webhook signature");
  }

  if (eventType !== "workflow_run") {
    logger.debug(`Ignoring GitHub event type: ${eventType}`);
    return null;
  }

  const payload = JSON.parse(rawBody) as GitHubWorkflowRunPayload;

  if (payload.action !== "completed") {
    logger.debug(`Ignoring workflow_run action: ${payload.action}`);
    return null;
  }

  logger.info("GitHub workflow_run completed", {
    workflow: payload.workflow_run.name,
    conclusion: payload.workflow_run.conclusion,
    repo: payload.repository.full_name,
    branch: payload.workflow_run.head_branch,
  });

  return payload;
}
