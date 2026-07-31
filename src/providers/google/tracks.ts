import type { GooglePlayClient } from "./client.js";

export type TrackName =
  | "internal"
  | "alpha"
  | "beta"
  | "production"
  | string;

export type ReleaseStatus =
  | "draft"
  | "inProgress"
  | "halted"
  | "completed";

export interface ReleaseNote {
  language: string;
  text: string;
}

export async function listTracks(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
) {
  const res = await client.api.edits.tracks.list({ packageName, editId });
  return res.data.tracks || [];
}

export async function getTrack(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  track: TrackName,
) {
  const res = await client.api.edits.tracks.get({
    packageName,
    editId,
    track,
  });
  return res.data;
}

export async function updateTrack(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  track: TrackName,
  versionCodes: string[],
  status: ReleaseStatus,
  options?: {
    releaseName?: string;
    releaseNotes?: ReleaseNote[];
    userFraction?: number;
    inAppUpdatePriority?: number;
  },
) {
  const release: Record<string, unknown> = {
    versionCodes,
    status,
  };

  if (options?.releaseName) release.name = options.releaseName;
  if (options?.releaseNotes) release.releaseNotes = options.releaseNotes;
  if (options?.userFraction && status === "inProgress")
    release.userFraction = options.userFraction;
  if (options?.inAppUpdatePriority)
    release.inAppUpdatePriority = options.inAppUpdatePriority;

  const res = await client.api.edits.tracks.update({
    packageName,
    editId,
    track,
    requestBody: {
      track,
      releases: [release],
    },
  });

  return res.data;
}

export async function promoteRelease(
  client: GooglePlayClient,
  packageName: string,
  fromTrack: TrackName,
  toTrack: TrackName,
  options?: {
    releaseName?: string;
    releaseNotes?: ReleaseNote[];
    userFraction?: number;
    status?: ReleaseStatus;
  },
) {
  const editId = await client.createEdit(packageName);

  const sourceTrack = await getTrack(client, packageName, editId, fromTrack);
  const currentRelease = sourceTrack.releases?.find(
    (r) => r.status === "completed" || r.status === "inProgress",
  );

  if (!currentRelease?.versionCodes?.length) {
    throw new Error(`No active release found on track "${fromTrack}"`);
  }

  const status = options?.status || "completed";

  const release: Record<string, unknown> = {
    versionCodes: currentRelease.versionCodes,
    status,
  };

  if (options?.releaseName) release.name = options.releaseName;
  if (options?.releaseNotes) release.releaseNotes = options.releaseNotes;
  if (options?.userFraction && status === "inProgress")
    release.userFraction = options.userFraction;

  await client.api.edits.tracks.update({
    packageName,
    editId,
    track: toTrack,
    requestBody: {
      track: toTrack,
      releases: [release],
    },
  });

  await client.commitEdit(packageName, editId);

  return {
    fromTrack,
    toTrack,
    versionCodes: currentRelease.versionCodes,
    status,
  };
}

export async function setRolloutFraction(
  client: GooglePlayClient,
  packageName: string,
  track: TrackName,
  userFraction: number,
) {
  const editId = await client.createEdit(packageName);

  const trackData = await getTrack(client, packageName, editId, track);
  const activeRelease = trackData.releases?.find(
    (r) => r.status === "inProgress",
  );

  if (!activeRelease?.versionCodes) {
    throw new Error(`No in-progress release found on track "${track}"`);
  }

  await client.api.edits.tracks.update({
    packageName,
    editId,
    track,
    requestBody: {
      track,
      releases: [
        {
          versionCodes: activeRelease.versionCodes,
          status: "inProgress",
          userFraction,
        },
      ],
    },
  });

  await client.commitEdit(packageName, editId);

  return { track, userFraction, versionCodes: activeRelease.versionCodes };
}

export async function haltRelease(
  client: GooglePlayClient,
  packageName: string,
  track: TrackName,
) {
  const editId = await client.createEdit(packageName);

  const trackData = await getTrack(client, packageName, editId, track);
  const activeRelease = trackData.releases?.find(
    (r) => r.status === "inProgress",
  );

  if (!activeRelease?.versionCodes) {
    throw new Error(`No in-progress release found on track "${track}"`);
  }

  await client.api.edits.tracks.update({
    packageName,
    editId,
    track,
    requestBody: {
      track,
      releases: [
        {
          versionCodes: activeRelease.versionCodes,
          status: "halted",
        },
      ],
    },
  });

  await client.commitEdit(packageName, editId);

  return { track, status: "halted", versionCodes: activeRelease.versionCodes };
}
