/**
 * Live StorePilot snapshot test (requires store credentials + storepilot.yaml).
 *
 * Usage:
 *   cd /path/to/your-app   # must contain storepilot.yaml
 *   APPLE_KEY_ID=... APPLE_ISSUER_ID=... APPLE_PRIVATE_KEY_PATH=... \
 *   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=... \
 *   node --import tsx /path/to/StorePilot/scripts/live-snapshot.ts
 */

import { loadConfig, validateConfig } from "../src/utils/config.js";
import { AppleClient } from "../src/providers/apple/client.js";
import { GooglePlayClient } from "../src/providers/google/client.js";
import { loadProjectProfile, loadProjectMemory } from "../src/core/project-profile.js";
import {
  buildReleaseSnapshot,
  explainBlockers,
} from "../src/core/release-snapshot.js";

async function main() {
  const config = loadConfig();
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error("Invalid config:\n" + validation.errors.join("\n"));
    process.exit(1);
  }

  const profile =
    config.projectProfile ?? loadProjectProfile(process.env.STOREPILOT_CONFIG_PATH);
  if (!profile) {
    console.error(
      "No storepilot.yaml found. Run from your app repo or set STOREPILOT_CONFIG_PATH.",
    );
    process.exit(1);
  }

  const apple = config.apple ? new AppleClient(config.apple) : undefined;
  const google = config.google ? new GooglePlayClient(config.google) : undefined;

  console.log(`Project: ${profile.project} (${profile.name ?? profile.project})`);
  console.log(`Config:  ${profile.configPath}\n`);

  const memory = loadProjectMemory(profile);
  console.log("Memory entries:", memory.history.length);

  console.log("\nFetching release snapshot...\n");
  const snapshot = await buildReleaseSnapshot(apple, google, { profile });
  const explained = explainBlockers(snapshot);

  console.log(JSON.stringify({ snapshot, explained }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
