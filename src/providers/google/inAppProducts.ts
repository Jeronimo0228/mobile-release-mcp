import type { GooglePlayClient } from "./client.js";
import { ToolError } from "../../utils/errors.js";

export async function listInAppProducts(
  client: GooglePlayClient,
  packageName: string,
  maxResults?: number,
  pageToken?: string,
) {
  try {
    const res = await client.api.monetization.onetimeproducts.list({
      packageName,
      pageSize: maxResults,
      pageToken,
    });
    return res.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("migrate") || message.includes("inappproducts")) {
      throw new ToolError(
        "Google Play in-app products API has moved to monetization.onetimeproducts. Update storepilot-mcp if this persists.",
        "GOOGLE_API_ERROR",
        false,
        "Use google_list_in_app_products with a current package version, or manage products in Play Console.",
      );
    }
    throw err;
  }
}

export async function getInAppProduct(
  client: GooglePlayClient,
  packageName: string,
  sku: string,
) {
  try {
    const res = await client.api.monetization.onetimeproducts.get({
      packageName,
      productId: sku,
    });
    return res.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("migrate") || message.includes("inappproducts")) {
      throw new ToolError(
        `Could not fetch in-app product "${sku}" via legacy API.`,
        "GOOGLE_API_ERROR",
        false,
        "Verify the product ID exists in Play Console monetization settings.",
      );
    }
    throw err;
  }
}

export async function createInAppProduct(
  _client: GooglePlayClient,
  _packageName: string,
  _product: {
    sku: string;
    purchaseType: "managedUser" | "subscription";
    defaultPrice: {
      priceMicros: string;
      currency: string;
    };
    listings: Record<string, { title: string; description: string }>;
    status: "active" | "inactive";
    defaultLanguage: string;
  },
) {
  throw new ToolError(
    "Creating in-app products via MCP is not yet supported on Google's new monetization API.",
    "NOT_IMPLEMENTED",
    false,
    "Create products in Google Play Console or use the monetization API directly.",
  );
}

export async function updateInAppProduct(
  _client: GooglePlayClient,
  _packageName: string,
  _sku: string,
  _product: {
    defaultPrice?: { priceMicros: string; currency: string };
    listings?: Record<string, { title: string; description: string }>;
    status?: "active" | "inactive";
  },
) {
  throw new ToolError(
    "Updating in-app products via MCP is not yet supported on Google's new monetization API.",
    "NOT_IMPLEMENTED",
    false,
    "Update products in Google Play Console.",
  );
}

export async function deleteInAppProduct(
  client: GooglePlayClient,
  packageName: string,
  sku: string,
) {
  const res = await client.api.monetization.onetimeproducts.delete({
    packageName,
    productId: sku,
  });
  return res.data;
}
