import type { GooglePlayClient } from "./client.js";

export async function listInAppProducts(
  client: GooglePlayClient,
  packageName: string,
  maxResults?: number,
  startIndex?: number,
) {
  const res = await client.api.inappproducts.list({
    packageName,
    maxResults,
    startIndex,
  });
  return res.data;
}

export async function getInAppProduct(
  client: GooglePlayClient,
  packageName: string,
  sku: string,
) {
  const res = await client.api.inappproducts.get({ packageName, sku });
  return res.data;
}

export async function createInAppProduct(
  client: GooglePlayClient,
  packageName: string,
  product: {
    sku: string;
    purchaseType: "managedUser" | "subscription";
    defaultPrice: {
      priceMicros: string;
      currency: string;
    };
    listings: Record<
      string,
      { title: string; description: string }
    >;
    status: "active" | "inactive";
    defaultLanguage: string;
  },
) {
  const res = await client.api.inappproducts.insert({
    packageName,
    requestBody: {
      packageName,
      ...product,
    },
  });
  return res.data;
}

export async function updateInAppProduct(
  client: GooglePlayClient,
  packageName: string,
  sku: string,
  product: {
    defaultPrice?: {
      priceMicros: string;
      currency: string;
    };
    listings?: Record<
      string,
      { title: string; description: string }
    >;
    status?: "active" | "inactive";
  },
) {
  const res = await client.api.inappproducts.patch({
    packageName,
    sku,
    requestBody: product,
  });
  return res.data;
}

export async function deleteInAppProduct(
  client: GooglePlayClient,
  packageName: string,
  sku: string,
) {
  await client.api.inappproducts.delete({ packageName, sku });
}
