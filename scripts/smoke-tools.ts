/**
 * Live smoke test for read-only MCP tools (requires store credentials).
 *
 * Usage:
 *   APPLE_KEY_ID=... APPLE_ISSUER_ID=... APPLE_PRIVATE_KEY_PATH=... \
 *   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=... \
 *   node --import tsx scripts/smoke-tools.ts
 *
 * Optional:
 *   SMOKE_APPLE_APP_ID=6793579931 SMOKE_GOOGLE_PACKAGE=com.hrip.app
 */

import { loadConfig, validateConfig } from "../src/utils/config.js";
import { AppleClient } from "../src/providers/apple/client.js";
import { GooglePlayClient } from "../src/providers/google/client.js";
import * as apps from "../src/providers/apple/apps.js";
import * as builds from "../src/providers/apple/builds.js";
import * as versions from "../src/providers/apple/versions.js";
import * as testflight from "../src/providers/apple/testflight.js";
import * as bundleIds from "../src/providers/apple/bundleIds.js";
import * as devices from "../src/providers/apple/devices.js";
import * as certificates from "../src/providers/apple/certificates.js";
import * as users from "../src/providers/apple/users.js";
import * as iap from "../src/providers/apple/iap.js";
import * as customerReviews from "../src/providers/apple/customerReviews.js";
import * as appInfo from "../src/providers/apple/appInfo.js";
import * as submissions from "../src/providers/apple/submissions.js";
import * as analytics from "../src/providers/apple/analytics.js";
import * as tracks from "../src/providers/google/tracks.js";
import * as listings from "../src/providers/google/listings.js";
import * as reviews from "../src/providers/google/reviews.js";
import * as inAppProducts from "../src/providers/google/inAppProducts.js";
import * as details from "../src/providers/google/details.js";
import * as testers from "../src/providers/google/testers.js";
import { withOptionalEdit } from "../src/providers/google/edits.js";

const appleAppId =
  process.env.SMOKE_APPLE_APP_ID ?? "6793579931";
const googlePackage =
  process.env.SMOKE_GOOGLE_PACKAGE ?? "com.hrip.app";

type SmokeCase = {
  name: string;
  run: () => Promise<unknown>;
};

function ok(value: unknown): boolean {
  return value !== undefined && value !== null;
}

async function main() {
  const config = loadConfig();
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error("Invalid config:\n" + validation.errors.join("\n"));
    process.exit(1);
  }

  const apple = config.apple ? new AppleClient(config.apple) : undefined;
  const google = config.google ? new GooglePlayClient(config.google) : undefined;

  const cases: SmokeCase[] = [];

  if (apple) {
    cases.push(
      { name: "apple_list_apps", run: () => apps.listApps(apple) },
      {
        name: "apple_get_app",
        run: () => apps.getApp(apple, appleAppId),
      },
      {
        name: "apple_list_builds",
        run: () => builds.listBuilds(apple, appleAppId),
      },
      {
        name: "apple_list_app_versions",
        run: () => versions.listAppStoreVersions(apple, appleAppId),
      },
      {
        name: "apple_list_beta_groups",
        run: () => testflight.listBetaGroups(apple, appleAppId),
      },
      { name: "apple_list_bundle_ids", run: () => bundleIds.listBundleIds(apple) },
      { name: "apple_list_devices", run: () => devices.listDevices(apple) },
      {
        name: "apple_list_certificates",
        run: () => certificates.listCertificates(apple),
      },
      { name: "apple_list_users", run: () => users.listUsers(apple) },
      {
        name: "apple_list_in_app_purchases",
        run: () => iap.listInAppPurchases(apple, appleAppId),
      },
      {
        name: "apple_list_customer_reviews",
        run: () => customerReviews.listCustomerReviews(apple, appleAppId),
      },
      {
        name: "apple_list_app_categories",
        run: () => appInfo.listAppCategories(apple),
      },
      {
        name: "apple_list_territories",
        run: () => appInfo.listTerritories(apple),
      },
      {
        name: "apple_get_price_tiers",
        run: () => submissions.listAppPricePoints(apple, appleAppId, { territory: "USA", limit: 10 }),
      },
      {
        name: "apple_list_analytics_report_requests",
        run: () => analytics.listAnalyticsReportRequests(apple, appleAppId),
      },
    );
  }

  if (google) {
    cases.push(
      {
        name: "google_list_tracks",
        run: () =>
          withOptionalEdit(google, googlePackage, undefined, (editId) =>
            tracks.listTracks(google, googlePackage, editId),
          ),
      },
      {
        name: "google_list_listings",
        run: () =>
          withOptionalEdit(google, googlePackage, undefined, (editId) =>
            listings.getListings(google, googlePackage, editId),
          ),
      },
      {
        name: "google_get_app_details",
        run: () =>
          withOptionalEdit(google, googlePackage, undefined, (editId) =>
            details.getAppDetails(google, googlePackage, editId),
          ),
      },
      {
        name: "google_list_bundles",
        run: () =>
          withOptionalEdit(google, googlePackage, undefined, (editId) =>
            details.listBundles(google, googlePackage, editId),
          ),
      },
      {
        name: "google_list_reviews",
        run: () => reviews.listReviews(google, googlePackage, { maxResults: 5 }),
      },
      {
        name: "google_list_in_app_products",
        run: () => inAppProducts.listInAppProducts(google, googlePackage, 10),
      },
      {
        name: "google_get_country_availability",
        run: () =>
          withOptionalEdit(google, googlePackage, undefined, (editId) =>
            testers.getCountryAvailability(google, googlePackage, editId, "production"),
          ),
      },
    );
  }

  let passed = 0;
  let failed = 0;
  const failures: Array<{ name: string; error: string }> = [];

  console.log(`Running ${cases.length} read-only smoke checks...\n`);

  for (const testCase of cases) {
    try {
      const result = await testCase.run();
      if (!ok(result)) {
        throw new Error("Returned empty/null response");
      }
      passed++;
      console.log(`✓ ${testCase.name}`);
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ name: testCase.name, error: message });
      console.log(`✗ ${testCase.name}`);
      console.log(`  ${message.split("\n")[0]}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`- ${f.name}: ${f.error.slice(0, 200)}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
