import jwt from "jsonwebtoken";
import type { AppleConfig } from "../../utils/config.js";
import { logger } from "../../utils/logger.js";
import { RetryableHttpError, withRetry } from "../../utils/retry.js";

const ASC_BASE_URL = "https://api.appstoreconnect.apple.com";
const TOKEN_EXPIRY_SECONDS = 20 * 60;
const DEFAULT_PAGE_LIMIT = "200";

interface AppleListResponse<T> {
  data: T[];
  links?: { next?: string };
  meta?: { paging?: { total?: number } };
}

export class AppleClient {
  private config: AppleConfig;
  private cachedToken?: { token: string; expiresAt: number };

  constructor(config: AppleConfig) {
    this.config = config;
  }

  private generateToken(): string {
    const now = Math.floor(Date.now() / 1000);

    if (this.cachedToken && this.cachedToken.expiresAt > now + 60) {
      return this.cachedToken.token;
    }

    const payload = {
      iss: this.config.issuerId,
      iat: now,
      exp: now + TOKEN_EXPIRY_SECONDS,
      aud: "appstoreconnect-v1",
    };

    const token = jwt.sign(payload, this.config.privateKey, {
      algorithm: "ES256",
      header: {
        alg: "ES256",
        kid: this.config.keyId,
        typ: "JWT",
      },
    });

    this.cachedToken = { token, expiresAt: now + TOKEN_EXPIRY_SECONDS };
    return token;
  }

  async request<T = unknown>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      params?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const { method = "GET", body, params } = options;

    let url = `${ASC_BASE_URL}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const token = this.generateToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    logger.debug(`Apple API ${method} ${path}`);

    return withRetry(
      async () => {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          logger.error(`Apple API error: ${response.status}`, errorBody);

          if ([429, 500, 502, 503, 504].includes(response.status)) {
            throw new RetryableHttpError(
              `App Store Connect API error ${response.status}: ${errorBody}`,
              response.status,
              errorBody,
            );
          }

          throw new Error(
            `App Store Connect API error ${response.status}: ${errorBody}`,
          );
        }

        if (response.status === 204) {
          return undefined as T;
        }

        return response.json() as Promise<T>;
      },
      `Apple API ${method} ${path}`,
    );
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(path, { params });
  }

  async getAll<T>(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T[]> {
    const paginatedParams = {
      ...params,
      limit: params.limit ?? DEFAULT_PAGE_LIMIT,
    };

    const allItems: T[] = [];
    let nextPath: string | undefined = path;
    let nextParams: Record<string, string> | undefined = paginatedParams;

    while (nextPath) {
      const response: { data?: T[]; links?: { next?: string } } =
        await this.request(nextPath, { params: nextParams });
      allItems.push(...(response.data ?? []));

      const next: string | undefined = response.links?.next;
      if (!next) break;

      const url = new URL(next);
      nextPath = url.pathname;
      nextParams = Object.fromEntries(url.searchParams.entries());
    }

    return allItems;
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  async patch<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  async delete(path: string): Promise<void> {
    await this.request(path, { method: "DELETE" });
  }
}
