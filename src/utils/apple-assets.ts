import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

export function md5ChecksumBase64(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("base64");
}

export async function readAssetFile(filePath: string): Promise<{
  buffer: Buffer;
  fileName: string;
  fileSize: number;
  checksum: string;
}> {
  const info = await stat(filePath);
  if (!info.isFile()) {
    throw new Error(`Asset path is not a file: ${filePath}`);
  }
  const buffer = await readFile(filePath);
  return {
    buffer,
    fileName: basename(filePath),
    fileSize: buffer.length,
    checksum: md5ChecksumBase64(buffer),
  };
}

interface UploadOperation {
  method?: string;
  url?: string;
  length?: number;
  offset?: number;
  requestHeaders?: Array<{ name?: string; value?: string }>;
}

export async function uploadAppleAssetParts(
  buffer: Buffer,
  operations: UploadOperation[],
): Promise<void> {
  for (const op of operations) {
    if (!op.url || !op.method) continue;

    const offset = op.offset ?? 0;
    const length = op.length ?? buffer.length - offset;
    const chunk = buffer.subarray(offset, offset + length);

    const headers: Record<string, string> = {};
    for (const h of op.requestHeaders ?? []) {
      if (h.name && h.value) headers[h.name] = h.value;
    }

    const response = await fetch(op.url, {
      method: op.method,
      headers,
      body: chunk,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Apple asset upload failed (${response.status}): ${body.slice(0, 200)}`,
      );
    }
  }
}

export async function pollAppleAssetReady(
  fetchStatus: () => Promise<{ state?: string; errors?: unknown }>,
  options?: { attempts?: number; delayMs?: number },
): Promise<void> {
  const attempts = options?.attempts ?? 30;
  const delayMs = options?.delayMs ?? 2000;

  for (let i = 0; i < attempts; i++) {
    const status = await fetchStatus();
    const state = status.state?.toUpperCase();
    if (state === "COMPLETE" || state === "UPLOAD_COMPLETE") return;
    if (state === "FAILED") {
      throw new Error(
        `Apple asset processing failed: ${JSON.stringify(status.errors ?? status)}`,
      );
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new Error("Timed out waiting for Apple asset processing");
}
