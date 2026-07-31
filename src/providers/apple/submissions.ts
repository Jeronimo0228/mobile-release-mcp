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

export async function getAppPriceTiers(client: AppleClient) {
  return client.get("/v1/appPriceTiers", {
    "fields[appPriceTiers]": "priceTierNumber",
    limit: "87",
  });
}
