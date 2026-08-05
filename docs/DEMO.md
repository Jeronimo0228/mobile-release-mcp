# StorePilot demo

Reproducible **read-only + dry-run** walkthrough — no store writes.

## Prerequisites

- Node.js ≥ 20
- `npm install -g storepilot-mcp@latest` (or `npx`)
- App Store Connect API key (`.p8`)
- Optional: Google Play service account for Android snapshot
- `storepilot.yaml` in your app repo — copy from [`storepilot.example.yaml`](../storepilot.example.yaml)

```bash
export STOREPILOT_CONFIG_PATH=/path/to/your-app/storepilot.yaml
export APPLE_KEY_ID=...
export APPLE_ISSUER_ID=...
export APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey.p8
export GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/play.json   # optional
export MCP_TOOLSET=release
export LOG_LEVEL=error
```

## One-command demo

```bash
bash scripts/demo-storepilot.sh
# or: npm run demo
```

Expected output (shape):

```json
{
  "project": "my-app",
  "blockers": ["Version 1.0 has no build assigned"],
  "nextActions": ["assign_build: ...", "promote_release: ..."]
}
```

```json
{
  "dryRun": true,
  "plan": "Configure 10% staged rollout on production",
  "steps": 2
}
```

## Agent demo (Cursor / Claude)

Paste in chat after MCP is connected:

```
1. load_project
2. explain_release_blockers
3. execute_release_intent with intent "configure_rollout", percentage 10, dryRun true
   (do NOT set confirm — dry-run only)
```

## External tester kit

Share with a colleague:

```bash
curl -fsSL https://raw.githubusercontent.com/Jeronimo0228/StorePilot/master/scripts/try-storepilot.sh | bash
```

Or clone and run:

```bash
git clone https://github.com/Jeronimo0228/StorePilot.git
cd StorePilot
# set env vars, then:
bash scripts/try-storepilot.sh
```

Feedback: [Try StorePilot issue template](https://github.com/Jeronimo0228/StorePilot/issues/new?template=try-storepilot.yml)

## Troubleshooting

| Issue | Fix |
|---|---|
| JSON parse error in CLI | `export LOG_LEVEL=error` (logs go to stderr) |
| `confirm` required on dry-run | Upgrade to ≥ 1.1.0 |
| No `storepilot.yaml` | Set `STOREPILOT_CONFIG_PATH` |
| Android snapshot empty | Add `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` |
