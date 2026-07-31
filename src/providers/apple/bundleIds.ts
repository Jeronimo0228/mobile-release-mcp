import type { AppleClient } from "./client.js";

export async function listBundleIds(
  client: AppleClient,
  filters?: {
    identifier?: string;
    name?: string;
    platform?: string;
  },
) {
  const params: Record<string, string> = {
    "fields[bundleIds]": "identifier,name,platform,seedId",
    sort: "name",
  };
  if (filters?.identifier)
    params["filter[identifier]"] = filters.identifier;
  if (filters?.name) params["filter[name]"] = filters.name;
  if (filters?.platform) params["filter[platform]"] = filters.platform;

  return client.get("/v1/bundleIds", params);
}

export async function getBundleId(
  client: AppleClient,
  bundleIdId: string,
) {
  return client.get(`/v1/bundleIds/${bundleIdId}`, {
    "fields[bundleIds]": "identifier,name,platform,seedId",
    include: "bundleIdCapabilities",
  });
}

export async function registerBundleId(
  client: AppleClient,
  identifier: string,
  name: string,
  platform: "IOS" | "MAC_OS" | "UNIVERSAL",
) {
  return client.post("/v1/bundleIds", {
    data: {
      type: "bundleIds",
      attributes: { identifier, name, platform },
    },
  });
}

export async function deleteBundleId(
  client: AppleClient,
  bundleIdId: string,
) {
  return client.delete(`/v1/bundleIds/${bundleIdId}`);
}

export async function listCapabilities(
  client: AppleClient,
  bundleIdId: string,
) {
  return client.get(`/v1/bundleIds/${bundleIdId}/bundleIdCapabilities`, {
    "fields[bundleIdCapabilities]": "capabilityType,settings",
  });
}

export async function enableCapability(
  client: AppleClient,
  bundleIdId: string,
  capabilityType: string,
  settings?: Array<{
    key: string;
    options?: Array<{ key: string; enabled: boolean }>;
  }>,
) {
  const attributes: Record<string, unknown> = { capabilityType };
  if (settings) attributes.settings = settings;

  return client.post("/v1/bundleIdCapabilities", {
    data: {
      type: "bundleIdCapabilities",
      attributes,
      relationships: {
        bundleId: { data: { type: "bundleIds", id: bundleIdId } },
      },
    },
  });
}

export async function disableCapability(
  client: AppleClient,
  capabilityId: string,
) {
  return client.delete(`/v1/bundleIdCapabilities/${capabilityId}`);
}
