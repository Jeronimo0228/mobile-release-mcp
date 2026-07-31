import type { AppleClient } from "./client.js";

export async function listInAppPurchases(
  client: AppleClient,
  appId: string,
) {
  return client.get(`/v1/apps/${appId}/inAppPurchasesV2`, {
    "fields[inAppPurchases]":
      "name,productId,inAppPurchaseType,state,referenceName",
    sort: "-referenceName",
  });
}

export async function getInAppPurchase(
  client: AppleClient,
  iapId: string,
) {
  return client.get(`/v2/inAppPurchases/${iapId}`, {
    "fields[inAppPurchases]":
      "name,productId,inAppPurchaseType,state,referenceName,reviewNote",
    include: "inAppPurchaseLocalizations,pricePoints",
  });
}

export async function createInAppPurchase(
  client: AppleClient,
  appId: string,
  attributes: {
    name: string;
    productId: string;
    inAppPurchaseType: "CONSUMABLE" | "NON_CONSUMABLE" | "NON_RENEWING_SUBSCRIPTION";
    referenceName: string;
    reviewNote?: string;
  },
) {
  return client.post("/v2/inAppPurchases", {
    data: {
      type: "inAppPurchases",
      attributes,
      relationships: {
        app: { data: { type: "apps", id: appId } },
      },
    },
  });
}

export async function updateInAppPurchase(
  client: AppleClient,
  iapId: string,
  attributes: {
    name?: string;
    referenceName?: string;
    reviewNote?: string;
  },
) {
  return client.patch(`/v2/inAppPurchases/${iapId}`, {
    data: {
      type: "inAppPurchases",
      id: iapId,
      attributes,
    },
  });
}

export async function deleteInAppPurchase(
  client: AppleClient,
  iapId: string,
) {
  return client.delete(`/v2/inAppPurchases/${iapId}`);
}

export async function listSubscriptionGroups(
  client: AppleClient,
  appId: string,
) {
  return client.get(`/v1/apps/${appId}/subscriptionGroups`, {
    "fields[subscriptionGroups]": "referenceName",
    include: "subscriptions",
  });
}

export async function createSubscriptionGroup(
  client: AppleClient,
  appId: string,
  referenceName: string,
) {
  return client.post("/v1/subscriptionGroups", {
    data: {
      type: "subscriptionGroups",
      attributes: { referenceName },
      relationships: {
        app: { data: { type: "apps", id: appId } },
      },
    },
  });
}

export async function listSubscriptions(
  client: AppleClient,
  subscriptionGroupId: string,
) {
  return client.get(
    `/v1/subscriptionGroups/${subscriptionGroupId}/subscriptions`,
    {
      "fields[subscriptions]":
        "name,productId,state,subscriptionPeriod,groupLevel,referenceName",
    },
  );
}

export async function createSubscription(
  client: AppleClient,
  subscriptionGroupId: string,
  attributes: {
    name: string;
    productId: string;
    referenceName: string;
    subscriptionPeriod:
      | "ONE_WEEK"
      | "ONE_MONTH"
      | "TWO_MONTHS"
      | "THREE_MONTHS"
      | "SIX_MONTHS"
      | "ONE_YEAR";
    groupLevel: number;
    reviewNote?: string;
  },
) {
  return client.post("/v1/subscriptions", {
    data: {
      type: "subscriptions",
      attributes,
      relationships: {
        group: {
          data: { type: "subscriptionGroups", id: subscriptionGroupId },
        },
      },
    },
  });
}
