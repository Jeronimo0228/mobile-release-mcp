import type { AppleClient } from "./client.js";

export async function listCertificates(
  client: AppleClient,
  filters?: {
    certificateType?: string;
    displayName?: string;
  },
) {
  const params: Record<string, string> = {
    "fields[certificates]":
      "name,certificateType,expirationDate,platform,serialNumber",
    sort: "-expirationDate",
  };
  if (filters?.certificateType)
    params["filter[certificateType]"] = filters.certificateType;
  if (filters?.displayName)
    params["filter[displayName]"] = filters.displayName;

  return client.get("/v1/certificates", params);
}

export async function getCertificate(
  client: AppleClient,
  certificateId: string,
) {
  return client.get(`/v1/certificates/${certificateId}`, {
    "fields[certificates]":
      "name,certificateType,expirationDate,platform,serialNumber,certificateContent",
  });
}

export async function revokeCertificate(
  client: AppleClient,
  certificateId: string,
) {
  return client.delete(`/v1/certificates/${certificateId}`);
}

export async function listProfiles(
  client: AppleClient,
  filters?: {
    profileType?: string;
    profileState?: string;
    name?: string;
  },
) {
  const params: Record<string, string> = {
    "fields[profiles]":
      "name,profileType,profileState,expirationDate,platform",
    sort: "-expirationDate",
  };
  if (filters?.profileType)
    params["filter[profileType]"] = filters.profileType;
  if (filters?.profileState)
    params["filter[profileState]"] = filters.profileState;
  if (filters?.name) params["filter[name]"] = filters.name;

  return client.get("/v1/profiles", params);
}

export async function getProfile(
  client: AppleClient,
  profileId: string,
) {
  return client.get(`/v1/profiles/${profileId}`, {
    "fields[profiles]":
      "name,profileType,profileState,expirationDate,platform,profileContent",
    include: "certificates,devices,bundleId",
  });
}

export async function createProfile(
  client: AppleClient,
  attributes: {
    name: string;
    profileType: string;
  },
  bundleIdId: string,
  certificateIds: string[],
  deviceIds?: string[],
) {
  const relationships: Record<string, unknown> = {
    bundleId: { data: { type: "bundleIds", id: bundleIdId } },
    certificates: {
      data: certificateIds.map((id) => ({ type: "certificates", id })),
    },
  };
  if (deviceIds?.length) {
    relationships.devices = {
      data: deviceIds.map((id) => ({ type: "devices", id })),
    };
  }

  return client.post("/v1/profiles", {
    data: {
      type: "profiles",
      attributes,
      relationships,
    },
  });
}

export async function deleteProfile(
  client: AppleClient,
  profileId: string,
) {
  return client.delete(`/v1/profiles/${profileId}`);
}
