import type { AppleClient } from "./client.js";

export async function listBuilds(
  client: AppleClient,
  appId: string,
  filters?: { version?: string; processingState?: string },
) {
  const params: Record<string, string> = {
    "filter[app]": appId,
    "fields[builds]":
      "version,uploadedDate,expirationDate,processingState,buildAudienceType,minOsVersion",
    sort: "-uploadedDate",
  };
  if (filters?.version) params["filter[version]"] = filters.version;
  if (filters?.processingState)
    params["filter[processingState]"] = filters.processingState;

  const data = await client.getAll("/v1/builds", params);
  return { data };
}

export async function getBuild(client: AppleClient, buildId: string) {
  return client.get(`/v1/builds/${buildId}`, {
    "fields[builds]":
      "version,uploadedDate,expirationDate,processingState,buildAudienceType,minOsVersion,iconAssetToken",
    include: "app,buildBetaDetail,betaBuildLocalizations",
  });
}
