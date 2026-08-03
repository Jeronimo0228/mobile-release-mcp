import { createReadStream } from "node:fs";
import type { GooglePlayClient } from "./client.js";

export async function uploadDeobfuscationFile(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  apkVersionCode: number,
  mappingPath: string,
  deobfuscationFileType: "proguard" | "nativeCode" = "proguard",
) {
  const res = await client.api.edits.deobfuscationfiles.upload({
    packageName,
    editId,
    apkVersionCode,
    deobfuscationFileType,
    media: {
      mimeType: "application/octet-stream",
      body: createReadStream(mappingPath),
    },
  });
  return res.data;
}
