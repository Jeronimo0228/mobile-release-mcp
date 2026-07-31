import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../utils/logger.js";

export interface EasBuildWebhookPayload {
  id: string;
  accountName: string;
  projectName: string;
  buildDetailsPageUrl: string;
  parentBuildId?: string;
  appId: string;
  initiatingUserId: string;
  cancelingUserId?: string;
  platform: "android" | "ios";
  status: "finished" | "errored" | "canceled";
  artifacts?: {
    buildUrl?: string;
    applicationArchiveUrl?: string;
  };
  metadata?: {
    appName?: string;
    appVersion?: string;
    appBuildVersion?: string;
    sdkVersion?: string;
    buildProfile?: string;
    channel?: string;
    distribution?: string;
    runtimeVersion?: string;
  };
  error?: {
    message: string;
    errorCode: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  expirationDate?: string;
}

export interface EasSubmitWebhookPayload {
  id: string;
  accountName: string;
  projectName: string;
  submissionDetailsPageUrl: string;
  parentSubmissionId?: string;
  appId: string;
  archiveUrl?: string;
  initiatingUserId: string;
  cancelingUserId?: string;
  platform: "android" | "ios";
  status: "finished" | "errored" | "canceled";
  submissionInfo?: {
    error?: {
      message: string;
      errorCode: string;
    };
    logsUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type EasWebhookPayload = EasBuildWebhookPayload | EasSubmitWebhookPayload;

export function verifyEasSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  const expectedSignature = createHmac("sha1", secret)
    .update(body)
    .digest("hex");

  const sigBuffer = Buffer.from(signature.replace("sha1=", ""), "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(sigBuffer, expectedBuffer);
}

export function parseEasWebhook(
  rawBody: string,
  signature: string | null,
  secret?: string,
): { event: "BUILD" | "SUBMIT"; payload: EasWebhookPayload } {
  if (secret && !verifyEasSignature(rawBody, signature, secret)) {
    throw new Error("Invalid EAS webhook signature");
  }

  const payload = JSON.parse(rawBody) as EasWebhookPayload;

  const event: "BUILD" | "SUBMIT" =
    "artifacts" in payload || "buildDetailsPageUrl" in payload
      ? "BUILD"
      : "SUBMIT";

  logger.info(`EAS ${event} webhook received`, {
    platform: payload.platform,
    status: payload.status,
    project: payload.projectName,
  });

  return { event, payload };
}
