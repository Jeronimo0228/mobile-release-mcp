# Toolsets

Agents work best with a **focused tool surface**. This server supports 101 tools, which can overwhelm context windows and increase mis-selection risk.

Use `MCP_TOOLSET` to register only what you need.

## Available toolsets

| Value | Tools registered | Best for |
|---|---|---|
| `all` (default) | All 101 tools | Full admin agents, power users |
| `release` | Read tools + release workflow tools | CI/CD release automation |
| `readonly` | List/get/status tools only | Monitoring, audits, status checks |

## Examples

### Release automation only

```env
MCP_TOOLSET=release
```

Includes tools like:

- `list_pending_webhooks`, `get_release_status`, `trigger_full_release`
- `apple_list_apps`, `apple_list_builds`, `apple_create_app_version`, `apple_submit_for_review`
- `google_list_tracks`, `google_create_release`, `google_promote_release`

Excludes admin tools (users, certificates, IAP management, etc.).

### Read-only monitoring

```env
MCP_TOOLSET=readonly
```

Includes list/get tools only. No writes, no submissions, no deletes.

## Destructive action confirmation

Tools that submit to review, delete resources, revoke certificates, or run full releases require:

```json
{
  "confirm": true
}
```

This applies even when `MCP_TOOLSET=all`. It prevents accidental production changes from agent hallucinations.

## Structured errors

All tools return JSON with consistent error shape on failure:

```json
{
  "success": false,
  "error": "App Store Connect API error 409: ...",
  "code": "UNKNOWN_ERROR",
  "retryable": false,
  "suggestion": "Check tool parameters and store API credentials."
}
```

Rate limit errors (`429`) are marked `retryable: true`.

## Choosing a toolset

| Scenario | Recommended toolset |
|---|---|
| Claude/Cursor local release assistant | `release` |
| Production webhook-driven agent | `release` |
| Team admin / full store management | `all` |
| Status bot in Slack | `readonly` |
| Security-sensitive environment | `readonly` or `release` |

See [TOOLS.md](./TOOLS.md) for the full tool catalog by category.
