/**
 * StorePilot CLI — status and snapshot without an MCP client.
 *
 * Usage:
 *   storepilot status [--config /path/to/storepilot.yaml]
 *   storepilot projects
 *   storepilot snapshot [--config /path/to/storepilot.yaml]
 */

import { loadConfig, validateConfig } from "./utils/config.js";
import { AppleClient } from "./providers/apple/client.js";
import { GooglePlayClient } from "./providers/google/client.js";
import {
  loadProjectProfile,
  loadProjectMemory,
  listRegisteredProjects,
} from "./core/project-profile.js";
import {
  buildReleaseSnapshot,
  explainBlockers,
} from "./core/release-snapshot.js";

function parseArgs(argv: string[]) {
  const command = argv[0] ?? "status";
  let configPath: string | undefined;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--config" && argv[i + 1]) {
      configPath = argv[++i];
    }
  }
  return { command, configPath };
}

async function main() {
  const { command, configPath } = parseArgs(process.argv.slice(2));

  if (command === "projects") {
    const projects = listRegisteredProjects();
    console.log(JSON.stringify({ count: projects.length, projects }, null, 2));
    return;
  }

  const config = loadConfig();
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error("Invalid config:\n" + validation.errors.join("\n"));
    process.exit(1);
  }

  const profile =
    loadProjectProfile(configPath ?? process.env.STOREPILOT_CONFIG_PATH) ??
    config.projectProfile;
  if (!profile) {
    console.error(
      "No storepilot.yaml found. Set STOREPILOT_CONFIG_PATH or run from your app repo.",
    );
    process.exit(1);
  }

  const apple = config.apple ? new AppleClient(config.apple) : undefined;
  const google = config.google ? new GooglePlayClient(config.google) : undefined;

  if (command === "status" || command === "snapshot") {
    const memory = loadProjectMemory(profile);
    const snapshot = await buildReleaseSnapshot(apple, google, { profile });
    const explained = explainBlockers(snapshot);
    console.log(
      JSON.stringify(
        {
          project: profile.project,
          name: profile.name,
          configPath: profile.configPath,
          memoryEntries: memory.history.length,
          snapshot,
          ...(command === "snapshot" ? { explained } : {}),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error("Usage: storepilot [status|snapshot|projects] [--config path]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
