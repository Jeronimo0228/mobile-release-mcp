import { createReadStream } from "node:fs";
import type { GooglePlayClient } from "./client.js";

export async function uploadInternalSharingApk(
  client: GooglePlayClient,
  packageName: string,
  apkPath: string,
) {
  const res = await client.api.internalappsharingartifacts.uploadapk({
    packageName,
    media: {
      mimeType: "application/vnd.android.package-archive",
      body: createReadStream(apkPath),
    },
  });
  return res.data;
}

export async function uploadInternalSharingBundle(
  client: GooglePlayClient,
  packageName: string,
  bundlePath: string,
) {
  const res = await client.api.internalappsharingartifacts.uploadbundle({
    packageName,
    media: {
      mimeType: "application/octet-stream",
      body: createReadStream(bundlePath),
    },
  });
  return res.data;
}
