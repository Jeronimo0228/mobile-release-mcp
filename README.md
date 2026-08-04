<div align="center">

# StorePilot

**Release orchestration MCP for App Store Connect + Google Play**

*Ask your agent “can I ship?” — get blockers, a plan, and safe dry-runs before touching production.*

<br />

[![npm version](https://img.shields.io/npm/v/mobile-release-mcp.svg?style=flat-square&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/mobile-release-mcp)
[![CI](https://img.shields.io/github/actions/workflow/status/Jeronimo0228/mobile-release-mcp/ci.yml?branch=master&style=flat-square&logo=github&label=CI)](https://github.com/Jeronimo0228/mobile-release-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-6366F1?style=flat-square)](https://modelcontextprotocol.io)

<br />

**npm:** [`mobile-release-mcp`](https://www.npmjs.com/package/mobile-release-mcp) · **CLI:** `storepilot`

[Golden path](#golden-path-storepilot) · [Quick start](#quick-start) · [Demo](docs/DEMO.md) · [Tools](docs/TOOLS.md) · [Compare](docs/COMPARISON.md) · [Launch post](docs/LAUNCH.md)

</div>

---

> **Not the same as** [silviosotelo/mobile-release-mcp](https://github.com/silviosotelo/mobile-release-mcp) (Fastlane/build focus).  
> **StorePilot** = store operations + release orchestration for AI agents.

## Why StorePilot

| Other MCP servers | StorePilot |
|---|---|
| 90+ low-level tools, agent picks one-by-one | **Snapshot → blockers → intent → execute** |
| No project memory | `storepilot.yaml` + `.storepilot/memory.json` |
| Writes hit production immediately | **`dryRun: true` by default** on workflows |
| Apple *or* Google depth | **Both**, plus escape hatch for long tail |
| No CI hooks | **EAS + GitHub webhooks** built in |

~**131 typed tools** · **91 in `release` toolset** · App Store Connect · Google Play · provenance on npm

## Golden path (StorePilot)

Three steps from zero to “agent knows if you can ship”:

### 1. Add `storepilot.yaml` to your app repo

```bash
cp path/to/mobile-release-mcp/storepilot.example.yaml ./storepilot.yaml
# Edit stores.ios.appId and stores.android.package
```

```yaml
project: my-app
stores:
  ios:
    appId: "1234567890"
    bundleId: com.example.app
  android:
    package: com.example.app
release:
  defaultRollout: 0.1
```

### 2. Point MCP at your project

```json
{
  "mcpServers": {
    "storepilot": {
      "command": "npx",
      "args": ["-y", "mobile-release-mcp@1.0.2"],
      "env": {
        "APPLE_KEY_ID": "YOUR_KEY_ID",
        "APPLE_ISSUER_ID": "YOUR_ISSUER_ID",
        "APPLE_PRIVATE_KEY_PATH": "/path/to/AuthKey.p8",
        "GOOGLE_SERVICE_ACCOUNT_KEY_PATH": "/path/to/play-service-account.json",
        "STOREPILOT_CONFIG_PATH": "/path/to/your-app/storepilot.yaml",
        "MCP_TOOLSET": "release"
      }
    }
  }
}
```

### 3. Ask your agent

```
"Load my project and explain what's blocking release."
→ load_project / get_release_snapshot / explain_release_blockers

"Plan a 10% production rollout (don't execute yet)."
→ execute_release_intent { intent: "rollout_production", percentage: 10, dryRun: true }

"When ready: promote Android internal → production at 10%."
→ execute_release_intent { intent: "promote_to_production", dryRun: false, confirm: true }
```

**CLI (no IDE):**

```bash
export STOREPILOT_CONFIG_PATH=./storepilot.yaml
# + Apple/Google env vars — see docs/CREDENTIALS.md
storepilot snapshot    # blockers + next actions
storepilot projects    # multi-app registry
```

Full walkthrough: **[docs/DEMO.md](docs/DEMO.md)**

## Quick start

```bash
npx -y mobile-release-mcp@1.0.2
```

Credentials: [docs/CREDENTIALS.md](docs/CREDENTIALS.md) — EAS webhooks do **not** replace App Store / Play API keys.

## Features

### Orchestrator (v1.0+)

- `get_release_snapshot` — production vs candidate, cross-platform blockers
- `explain_release_blockers` — human-readable “what to do next”
- `execute_release_intent` — rollout, promote, submit (dry-run default)
- `list_projects` — multi-app registry via `STOREPILOT_PROJECTS_DIR`
- `promote_release`, `configure_rollout`, `create_tester_group`

### Safety & ops

- **`confirm: true`** on destructive writes; workflows skip confirm when `dryRun` is true (default)
- **Toolsets:** `MCP_TOOLSET=release` | `readonly` | `all`
- **Escape hatch:** `apple_api_call`, `google_api_call` for long-tail API
- **Webhooks:** EAS Build/Submit + GitHub Actions → `list_pending_webhooks`
- **Transports:** stdio (Cursor/Claude) or HTTP `/mcp`
- **Tests:** `npm test` (42+), `npm run smoke` (live, needs credentials)

### Store coverage

- **Apple:** builds, TestFlight, metadata, screenshots, export compliance, submission preflight
- **Google:** tracks, uploads, subscriptions, internal app sharing, deobfuscation maps

See [docs/TOOLS.md](docs/TOOLS.md) · [docs/COMPARISON.md](docs/COMPARISON.md)

## Configuration

| Variable | Description |
|---|---|
| `STOREPILOT_CONFIG_PATH` | Path to `storepilot.yaml` |
| `STOREPILOT_PROJECTS_DIR` | Directory of app repos for `list_projects` |
| `MCP_TOOLSET` | `release` (recommended), `readonly`, `all` |
| `APPLE_*` / `GOOGLE_*` | Store API credentials — [CREDENTIALS.md](docs/CREDENTIALS.md) |
| `EAS_PROJECT_MAPPINGS` | Map EAS project → store IDs for webhooks |
| `LOG_LEVEL` | Set `error` for clean CLI JSON output |

Full env reference: [.env.example](.env.example)

## Webhook flow

```
EAS/GitHub → POST /webhook/* → verify → persist
  → list_pending_webhooks
  → get_release_snapshot
  → execute_release_intent (dryRun → confirm)
  → mark_webhook_processed
```

## Development

```bash
git clone https://github.com/Jeronimo0228/mobile-release-mcp.git
cd mobile-release-mcp
npm install
npm test
npm run build
npm run storepilot -- snapshot   # from source
```

Try it without cloning: **`npx mobile-release-mcp@1.0.2`** + [scripts/try-storepilot.sh](scripts/try-storepilot.sh)

## Project structure

```
src/
├── core/           Release snapshot, workflows, release-intent
├── tools/          MCP registrations (orchestrator, apple, google, escape)
├── providers/      App Store Connect + Google Play clients
├── plugins/        Plugin hook contract (v1.0)
├── cli.ts          storepilot CLI
└── webhook/        EAS + GitHub
docs/               DEMO, TOOLS, COMPARISON, LAUNCH (LinkedIn draft)
```

## Feedback

Early v1 — we want real-world reports: [Try StorePilot feedback](https://github.com/Jeronimo0228/mobile-release-mcp/issues/new?template=try-storepilot.yml)

## License

MIT — see [LICENSE](LICENSE).
