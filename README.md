# mobile-release-mcp

[![npm version](https://img.shields.io/npm/v/mobile-release-mcp.svg)](https://www.npmjs.com/package/mobile-release-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

MCP server for managing mobile app releases on **App Store Connect** and **Google Play Console**. Exposes **101 tools** for MCP-compatible agents (Cursor, Claude Desktop, custom SDK agents) to manage the full iOS and Android release lifecycle.

Receives webhooks from **EAS Build/Submit** and **GitHub Actions** to react to CI/CD events automatically.

## Install

```bash
# Run directly (recommended for MCP clients)
npx -y mobile-release-mcp

# Or install globally
npm install -g mobile-release-mcp
mobile-release-mcp
```

No deployment required for local use with Cursor or Claude Desktop.

## Quick start

### 1. Get credentials

You need **App Store Connect** and/or **Google Play** API credentials. EAS webhooks do not replace these — see [docs/CREDENTIALS.md](docs/CREDENTIALS.md).

### 2. Connect to Cursor or Claude Desktop

```json
{
  "mcpServers": {
    "mobile-release": {
      "command": "npx",
      "args": ["-y", "mobile-release-mcp"],
      "env": {
        "APPLE_KEY_ID": "ABC1234DEF",
        "APPLE_ISSUER_ID": "00000000-0000-0000-0000-000000000000",
        "APPLE_PRIVATE_KEY_PATH": "/path/to/AuthKey.p8",
        "MCP_TOOLSET": "release"
      }
    }
  }
}
```

### 3. Ask your agent

> "List my App Store apps and the latest build for each one."

### Alternative: run from source

```bash
git clone https://github.com/Jeronimo0228/mobile-release-mcp.git
cd mobile-release-mcp
npm install
cp .env.example .env
# Edit .env with your credentials
npm run build
npm start
```

For local development from source, point MCP clients to `node /path/to/dist/index.js` instead of `npx`.

## Why use this

| Benefit | What you get |
|---|---|
| **Agent-native releases** | Agents call typed tools instead of fragile shell scripts around `fastlane` or manual store UI clicks |
| **Cross-platform** | One MCP server for App Store Connect and Google Play |
| **Webhook-driven CI** | EAS/GitHub events trigger agent workflows via `list_pending_webhooks` |
| **Production-ready defaults** | Retries on rate limits, pagination, persistent webhooks, startup validation |
| **Safe by default** | Destructive tools require `confirm: true`; toolsets limit agent surface area |

## Features

- **101 MCP tools** — iOS, Android, and shared release operations
- **Webhook listener** — EAS (Build + Submit) and GitHub Actions (`workflow_run`)
- **Signature verification** — HMAC-SHA1 (EAS), HMAC-SHA256 (GitHub); secrets required in production
- **Persistent webhooks** — events saved to disk (`WEBHOOK_STORAGE_PATH`), survive restarts
- **Unified release flow** — `trigger_full_release` for both platforms
- **Stdio + HTTP transports** — local MCP clients or remote `/mcp` deployment
- **Configurable toolsets** — `all`, `release`, or `readonly` via `MCP_TOOLSET`
- **Structured errors** — consistent JSON errors with retry hints for agents

## Documentation

| Doc | Contents |
|---|---|
| [docs/CREDENTIALS.md](docs/CREDENTIALS.md) | Store credentials vs webhook secrets, EAS project mapping |
| [docs/TOOLSETS.md](docs/TOOLSETS.md) | Limiting tools for agents (`MCP_TOOLSET`) |
| [docs/TOOLS.md](docs/TOOLS.md) | Full tool catalog with categories |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Transports, reliability, project layout |

## Configuration

Copy `.env.example` to `.env` when running from source, or set env vars in your MCP client config.

Minimum for iOS:

```env
APPLE_KEY_ID=ABC1234DEF
APPLE_ISSUER_ID=00000000-0000-0000-0000-000000000000
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey.p8
MCP_TOOLSET=release
```

### All environment variables

| Variable | Default | Description |
|---|---|---|
| `APPLE_KEY_ID` | — | App Store Connect API key ID |
| `APPLE_ISSUER_ID` | — | App Store Connect issuer ID |
| `APPLE_PRIVATE_KEY_PATH` | — | Path to `.p8` key file |
| `APPLE_PRIVATE_KEY_BASE64` | — | Alternative: base64-encoded key |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | — | Path to service account JSON |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | — | Alternative: inline JSON |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `MCP_PORT` | `3000` | HTTP server port (when `http`) |
| `MCP_TOOLSET` | `all` | `all`, `release`, or `readonly` |
| `WEBHOOK_PORT` | `3000` | Webhook port in stdio mode |
| `WEBHOOK_STORAGE_PATH` | `.data/webhooks.json` | Persistent webhook storage |
| `WEBHOOK_REQUIRE_SECRETS` | `true` | Reject webhooks without secrets |
| `EAS_WEBHOOK_SECRET` | — | EAS HMAC secret |
| `GITHUB_WEBHOOK_SECRET` | — | GitHub HMAC secret |
| `EAS_PROJECT_MAPPINGS` | — | JSON map EAS project → store IDs |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

## Requirements

- Node.js >= 20
- [App Store Connect API key](https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api) (for iOS tools)
- [Google Play service account](https://developers.google.com/android-publisher/getting_started#using_a_service_account) (for Android tools)

> **Important:** EAS webhooks notify you about builds — they do **not** provide store API credentials. See [docs/CREDENTIALS.md](docs/CREDENTIALS.md).

## HTTP deployment (remote MCP)

```env
MCP_TRANSPORT=http
MCP_PORT=3000
EAS_WEBHOOK_SECRET=your-secret
GITHUB_WEBHOOK_SECRET=your-secret
```

Endpoints on a single server:

| Endpoint | Method | Purpose |
|---|---|---|
| `/mcp` | GET, POST, DELETE | MCP Streamable HTTP transport |
| `/webhook/eas` | POST | EAS build/submit webhooks |
| `/webhook/github` | POST | GitHub Actions webhooks |
| `/health` | GET | Health check |

Connect MCP clients to `http://your-host:3000/mcp`.

Deploy with `npx mobile-release-mcp` as the start command and env vars from your host's secret manager (Railway, Fly.io, etc.).

## Webhook setup

### EAS

```bash
eas webhook:create --event BUILD --url https://your-server.com/webhook/eas --secret your-eas-secret
eas webhook:create --event SUBMIT --url https://your-server.com/webhook/eas --secret your-eas-secret
```

### GitHub Actions

Settings → Webhooks → Payload URL: `https://your-server.com/webhook/github`, events: **Workflow runs**.

### EAS project mapping

Map Expo project names to store identifiers:

```env
EAS_PROJECT_MAPPINGS=[{"projectName":"my-app","iosAppId":"1234567890","androidPackageName":"com.example.app"}]
```

### Webhook flow

```
EAS/GitHub → POST /webhook/* → verify signature → persist to disk
  → Agent: list_pending_webhooks (includes mappedTargets)
  → Agent: trigger_full_release (confirm: true)
  → Agent: mark_webhook_processed
```

## Examples

### Release on both platforms

```json
{
  "platforms": ["ios", "android"],
  "confirm": true,
  "ios": {
    "appId": "1234567890",
    "buildId": "abc-build-id",
    "versionString": "2.1.0",
    "releaseNotes": [{ "locale": "en-US", "whatsNew": "Bug fixes" }]
  },
  "android": {
    "packageName": "com.example.app",
    "versionCodes": ["42"],
    "track": "production",
    "status": "completed"
  }
}
```

### React to EAS build webhook

```
1. list_pending_webhooks → check mappedTargets.appleAppId
2. apple_list_builds → verify build is VALID
3. trigger_full_release with confirm: true
4. mark_webhook_processed
```

See [docs/TOOLS.md](docs/TOOLS.md) for the complete tool reference.

## Development

```bash
npm run dev        # Run with tsx
npm run typecheck  # TypeScript check
npm run build      # Production build
npm test           # Run tests
```

Publishing instructions: [docs/PUBLISHING.md](docs/PUBLISHING.md)

## Project structure

```
src/
├── index.ts              Entry point
├── server.ts             MCP server factory
├── http/app.ts           HTTP transport (MCP + webhooks)
├── providers/apple/      App Store Connect API
├── providers/google/     Google Play Developer API
├── tools/                MCP tool registrations
├── webhook/              Webhook routes, storage, parsers
└── utils/                Config, retry, errors, tool registry
docs/                     Detailed documentation
tests/                    Unit tests
```

## License

MIT — see [LICENSE](LICENSE).
