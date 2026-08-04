# StorePilot demo

Reproducible demo for LinkedIn GIF, README, or conference clip. **Read-only + dry-run** — no store writes.

## Prerequisites

- Node.js ≥ 20
- `npm install -g mobile-release-mcp@latest` (or `npx`)
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

## Record a GIF (60 seconds)

### Option A — Terminal recorder (recommended)

```bash
# asciinema (install: dnf install asciinema / brew install asciinema)
asciinema rec storepilot-demo.cast
bash scripts/demo-storepilot.sh
# Ctrl+D to stop, then:
agg storepilot-demo.cast storepilot-demo.gif
```

### Option B — OBS / SimpleScreenRecorder

1. Terminal full-screen, dark theme, font 16–18pt
2. Run `bash scripts/demo-storepilot.sh`
3. Crop to terminal, export 30–60s MP4 → convert to GIF (≤ 5 MB for LinkedIn)

### Option C — Static screenshot carousel

If no GIF: use three screenshots from demo steps 2–4 (snapshot JSON, tool list, dry-run plan).

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
curl -fsSL https://raw.githubusercontent.com/Jeronimo0228/mobile-release-mcp/master/scripts/try-storepilot.sh | bash
```

Or clone and run:

```bash
git clone https://github.com/Jeronimo0228/mobile-release-mcp.git
cd mobile-release-mcp
# set env vars, then:
bash scripts/try-storepilot.sh
```

Feedback: [Try StorePilot issue template](https://github.com/Jeronimo0228/mobile-release-mcp/issues/new?template=try-storepilot.yml)

## Troubleshooting

| Issue | Fix |
|---|---|
| JSON parse error in CLI | `export LOG_LEVEL=error` (logs go to stderr) |
| `confirm` required on dry-run | Upgrade to ≥ 1.0.2 |
| No `storepilot.yaml` | Set `STOREPILOT_CONFIG_PATH` |
| Android snapshot empty | Add `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` |
