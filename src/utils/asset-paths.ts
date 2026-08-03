import { isAbsolute, resolve } from "node:path";
import { accessSync, constants } from "node:fs";

export function assertReadableAssetPath(filePath: string): string {
  if (!isAbsolute(filePath)) {
    throw new Error(
      "Asset path must be absolute (e.g. /home/user/screenshot.png)",
    );
  }
  if (filePath.includes("..")) {
    throw new Error("Asset path must not contain '..'");
  }
  const resolved = resolve(filePath);
  accessSync(resolved, constants.R_OK);
  return resolved;
}
