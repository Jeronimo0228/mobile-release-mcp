import type { GooglePlayClient } from "./client.js";
import type { ReleaseNote, ReleaseStatus, TrackName } from "./tracks.js";
import { uploadBundle } from "./bundles.js";

export async function setReleaseNotes(
  client: GooglePlayClient,
  packageName: string,
  track: TrackName,
  releaseNotes: ReleaseNote[],
) {
  const editId = await client.createEdit(packageName);

  const trackRes = await client.api.edits.tracks.get({
    packageName,
    editId,
    track,
  });

  const currentRelease = trackRes.data.releases?.find(
    (r) => r.status === "completed" || r.status === "inProgress" || r.status === "draft",
  );

  if (!currentRelease?.versionCodes) {
    throw new Error(`No release found on track "${track}"`);
  }

  await client.api.edits.tracks.update({
    packageName,
    editId,
    track,
    requestBody: {
      track,
      releases: [
        {
          ...currentRelease,
          releaseNotes,
        },
      ],
    },
  });

  await client.commitEdit(packageName, editId);

  return { track, releaseNotes };
}

export async function createRelease(
  client: GooglePlayClient,
  packageName: string,
  track: TrackName,
  versionCodes: string[],
  status: ReleaseStatus,
  options?: {
    releaseName?: string;
    releaseNotes?: ReleaseNote[];
    userFraction?: number;
  },
) {
  const editId = await client.createEdit(packageName);

  const release: Record<string, unknown> = {
    versionCodes,
    status,
  };

  if (options?.releaseName) release.name = options.releaseName;
  if (options?.releaseNotes) release.releaseNotes = options.releaseNotes;
  if (options?.userFraction && status === "inProgress")
    release.userFraction = options.userFraction;

  await client.api.edits.tracks.update({
    packageName,
    editId,
    track,
    requestBody: {
      track,
      releases: [release],
    },
  });

  await client.commitEdit(packageName, editId);

  return { track, versionCodes, status };
}

export async function uploadBundleAndRelease(
  client: GooglePlayClient,
  packageName: string,
  bundlePath: string,
  track: TrackName,
  status: ReleaseStatus,
  options?: {
    releaseName?: string;
    releaseNotes?: ReleaseNote[];
    userFraction?: number;
    ackBundleInstallationWarning?: boolean;
  },
) {
  const editId = await client.createEdit(packageName);
  try {
    const bundle = await uploadBundle(client, packageName, editId, bundlePath, {
      ackBundleInstallationWarning: options?.ackBundleInstallationWarning,
    });
    const versionCode = String(bundle.versionCode);
    const release: Record<string, unknown> = {
      versionCodes: [versionCode],
      status,
    };
    if (options?.releaseName) release.name = options.releaseName;
    if (options?.releaseNotes) release.releaseNotes = options.releaseNotes;
    if (options?.userFraction != null && status === "inProgress") {
      release.userFraction = options.userFraction;
    }

    await client.api.edits.tracks.update({
      packageName,
      editId,
      track,
      requestBody: { track, releases: [release] },
    });
    await client.commitEdit(packageName, editId);
    return { editId, bundle, track, versionCode, status, committed: true };
  } catch (err) {
    await client.deleteEdit(packageName, editId).catch(() => {});
    throw err;
  }
}
