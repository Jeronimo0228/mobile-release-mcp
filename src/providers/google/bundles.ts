import { createReadStream } from "node:fs";
import type { GooglePlayClient } from "./client.js";

export async function uploadBundle(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  bundlePath: string,
  options?: {
    ackBundleInstallationWarning?: boolean;
  },
) {
  const res = await client.api.edits.bundles.upload({
    packageName,
    editId,
    ackBundleInstallationWarning: options?.ackBundleInstallationWarning,
    media: {
      mimeType: "application/octet-stream",
      body: createReadStream(bundlePath),
    },
  });
  return res.data;
}

export async function uploadApk(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  apkPath: string,
) {
  const res = await client.api.edits.apks.upload({
    packageName,
    editId,
    media: {
      mimeType: "application/vnd.android.package-archive",
      body: createReadStream(apkPath),
    },
  });
  return res.data;
}

export async function uploadAndCommitBundle(
  client: GooglePlayClient,
  packageName: string,
  bundlePath: string,
  options?: {
    ackBundleInstallationWarning?: boolean;
  },
) {
  const editId = await client.createEdit(packageName);
  try {
    const bundle = await uploadBundle(
      client,
      packageName,
      editId,
      bundlePath,
      options,
    );
    await client.commitEdit(packageName, editId);
    return { editId, bundle, committed: true };
  } catch (err) {
    await client.deleteEdit(packageName, editId).catch(() => {});
    throw err;
  }
}
