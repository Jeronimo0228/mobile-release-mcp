import { logger } from "./logger.js";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULT_RETRYABLE = [429, 500, 502, 503, 504];

export function isRetryableStatus(
  status: number,
  retryableStatuses = DEFAULT_RETRYABLE,
): boolean {
  return retryableStatuses.includes(status);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 4,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    retryableStatuses = DEFAULT_RETRYABLE,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const status =
        err instanceof RetryableHttpError ? err.status : undefined;
      const retryable =
        status !== undefined && isRetryableStatus(status, retryableStatuses);

      if (!retryable || attempt === maxAttempts) {
        throw err;
      }

      const delay = Math.min(
        baseDelayMs * 2 ** (attempt - 1),
        maxDelayMs,
      );
      logger.warn(
        `${label} failed (${status}), retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

export class RetryableHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "RetryableHttpError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
