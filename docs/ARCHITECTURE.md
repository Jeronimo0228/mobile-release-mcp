# Architecture

## Overview

```
┌─────────────────┐     stdio or HTTP      ┌──────────────────────┐
│  MCP Client     │ ◄────────────────────► │  mobile-release-mcp  │
│  (Cursor, etc.) │                        │                      │
└─────────────────┘                        │  ┌────────────────┐  │
                                           │  │ Tool registrar │  │
┌─────────────────┐     POST /webhook/*    │  │ (toolsets +    │  │
│  EAS / GitHub   │ ─────────────────────► │  │  confirm)      │  │
└─────────────────┘                        │  └───────┬────────┘  │
                                           │          │           │
                                           │  ┌───────▼────────┐  │
                                           │  │ Apple / Google │  │
                                           │  │ providers      │  │
                                           │  └───────┬────────┘  │
                                           └──────────┼──────────┘
                                                      │
                              ┌───────────────────────┴───────────────────────┐
                              │                                               │
                    App Store Connect API                         Google Play API
```

## Transports

### Stdio (default)

- Best for Cursor, Claude Desktop, local agents.
- MCP communicates over stdin/stdout.
- Optional separate webhook server on `WEBHOOK_PORT` when secrets are configured.

### HTTP

- Set `MCP_TRANSPORT=http`.
- Single server on `MCP_PORT` exposes:
  - `GET /health` — health check
  - `ALL /mcp` — MCP Streamable HTTP transport
  - `POST /webhook/eas` — EAS webhooks
  - `POST /webhook/github` — GitHub webhooks

## Reliability features

| Feature | Implementation |
|---|---|
| Apple rate limits | Exponential backoff retry on 429/5xx |
| Google rate limits | Retry wrapper on edit operations |
| Apple pagination | `getAll()` follows `links.next` |
| Google read-only queries | `withEdit()` creates and deletes temporary edits |
| Webhook durability | JSON file persistence at `WEBHOOK_STORAGE_PATH` |
| Startup validation | Fails fast with actionable error messages |

## Webhook flow

1. EAS or GitHub sends signed POST request.
2. Signature verified (required in production).
3. Event stored to disk with optional `mappedTargets` from `EAS_PROJECT_MAPPINGS`.
4. Agent polls `list_pending_webhooks` or reads `webhook://pending` resource.
5. Agent executes release tools using store credentials.
6. Agent calls `mark_webhook_processed`.

## Project layout

```
src/
├── index.ts              Entry point, transport selection
├── server.ts             MCP server factory
├── http/app.ts           Unified HTTP app (MCP + webhooks)
├── providers/            Store API clients and operations
├── tools/                MCP tool registrations
├── webhook/              Webhook parsing, storage, routes
└── utils/                Config, retry, errors, tool registry
```

## Related docs

- [CREDENTIALS.md](./CREDENTIALS.md) — what to configure and why
- [TOOLSETS.md](./TOOLSETS.md) — limiting tool surface for agents
- [TOOLS.md](./TOOLS.md) — full tool reference by category
