import type { AppleClient } from "./client.js";

export async function listApps(
  client: AppleClient,
  filters?: { bundleId?: string; name?: string },
) {
  const params: Record<string, string> = {};
  if (filters?.bundleId) params["filter[bundleId]"] = filters.bundleId;
  if (filters?.name) params["filter[name]"] = filters.name;
  params["fields[apps]"] =
    "name,bundleId,sku,primaryLocale,contentRightsDeclaration";

  const data = await client.getAll("/v1/apps", params);
  return { data };
}

export async function getApp(client: AppleClient, appId: string) {
  return client.get(`/v1/apps/${appId}`, {
    "fields[apps]":
      "name,bundleId,sku,primaryLocale,contentRightsDeclaration,appStoreVersions",
    include: "appStoreVersions",
  });
}
