import type { AppleClient } from "./client.js";

export async function submitForReview(
  client: AppleClient,
  versionId: string,
) {
  return client.post("/v1/appStoreVersionSubmissions", {
    data: {
      type: "appStoreVersionSubmissions",
      relationships: {
        appStoreVersion: {
          data: { type: "appStoreVersions", id: versionId },
        },
      },
    },
  });
}

export async function getReviewStatus(
  client: AppleClient,
  versionId: string,
) {
  const version = await client.get<{
    data: {
      id: string;
      attributes: {
        versionString: string;
        appStoreState: string;
      };
    };
  }>(`/v1/appStoreVersions/${versionId}`, {
    "fields[appStoreVersions]": "versionString,appStoreState",
  });

  return {
    versionId,
    versionString: version.data.attributes.versionString,
    state: version.data.attributes.appStoreState,
  };
}

export async function setAppPricing(
  client: AppleClient,
  appId: string,
  priceTier: string,
) {
  const priceSchedules = await client.get<{
    data: Array<{ id: string }>;
  }>(`/v1/apps/${appId}/appPriceSchedule`);

  return client.post("/v1/appPricePoints", {
    data: {
      type: "appPrices",
      attributes: {},
      relationships: {
        app: { data: { type: "apps", id: appId } },
        priceTier: { data: { type: "appPriceTiers", id: priceTier } },
      },
    },
  });
}

export async function listAppPricePoints(
  client: AppleClient,
  appId: string,
  options?: {
    territory?: string;
    limit?: number;
  },
) {
  const territory = options?.territory ?? "USA";
  const limit = options?.limit ?? 200;

  return client.get(`/v1/apps/${appId}/appPricePoints`, {
    "fields[appPricePoints]": "customerPrice,proceeds",
    "filter[territory]": territory,
    limit: String(limit),
    include: "territory",
  });
}

/** @deprecated Use listAppPricePoints — global /v1/appPriceTiers was removed by Apple */
export async function getAppPriceTiers(client: AppleClient, appId: string, territory?: string) {
  return listAppPricePoints(client, appId, { territory });
}
