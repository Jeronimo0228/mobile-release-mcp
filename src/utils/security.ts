import { createHash, timingSafeEqual } from "node:crypto";
import { isAbsolute, resolve, sep } from "node:path";

export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

export function secureCompare(provided: string, expected: string): boolean {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

export function resolveSafeStoragePath(
  storagePath: string,
  baseDir = process.cwd(),
): string {
  if (isAbsolute(storagePath)) {
    throw new Error(
      "WEBHOOK_STORAGE_PATH must be a relative path within the project directory",
    );
  }

  if (storagePath.includes("..")) {
    throw new Error("WEBHOOK_STORAGE_PATH must not contain '..'");
  }

  const resolvedBase = resolve(baseDir);
  const resolvedPath = resolve(resolvedBase, storagePath);

  if (
    resolvedPath !== resolvedBase &&
    !resolvedPath.startsWith(resolvedBase + sep)
  ) {
    throw new Error(
      "WEBHOOK_STORAGE_PATH resolves outside the allowed directory",
    );
  }

  return resolvedPath;
}

export function assertBodySize(body: string, maxBytes: number): void {
  if (Buffer.byteLength(body, "utf8") > maxBytes) {
    throw new Error(`Request body exceeds ${maxBytes} bytes`);
  }
}

export function safeJsonParse<T>(raw: string, label: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Invalid JSON in ${label}`);
  }
}
