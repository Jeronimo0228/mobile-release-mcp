import type { GooglePlayClient } from "./client.js";

export async function listSubscriptions(
  client: GooglePlayClient,
  packageName: string,
  pageSize = 50,
) {
  const res = await client.api.monetization.subscriptions.list({
    packageName,
    pageSize,
  });
  return res.data;
}

export async function getSubscription(
  client: GooglePlayClient,
  packageName: string,
  productId: string,
) {
  const res = await client.api.monetization.subscriptions.get({
    packageName,
    productId,
  });
  return res.data;
}
