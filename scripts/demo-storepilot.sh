#!/usr/bin/env bash
# StorePilot demo — clean terminal output for recording or CI smoke.
# Usage: see docs/DEMO.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

run_storepilot() {
  if command -v storepilot >/dev/null 2>&1; then
    storepilot "$@"
  elif [[ -f "$ROOT/dist/cli.js" ]]; then
    node "$ROOT/dist/cli.js" "$@"
  else
    echo "Run npm run build first (or install storepilot-mcp globally)" >&2
    exit 1
  fi
}

run_mcp() {
  "${MCP_CMD[@]}" "$@"
}

if command -v storepilot-mcp >/dev/null 2>&1; then
  MCP_CMD=(storepilot-mcp)
elif command -v mobile-release-mcp >/dev/null 2>&1; then
  MCP_CMD=(mobile-release-mcp)
elif [[ -f "$ROOT/dist/index.js" ]]; then
  MCP_CMD=(node "$ROOT/dist/index.js")
else
  echo "Run npm run build first (or install storepilot-mcp globally)" >&2
  exit 1
fi

if [[ -z "${STOREPILOT_CONFIG_PATH:-}" ]]; then
  echo "Set STOREPILOT_CONFIG_PATH to your storepilot.yaml" >&2
  exit 1
fi

for var in APPLE_KEY_ID APPLE_ISSUER_ID APPLE_PRIVATE_KEY_PATH; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing $var (Apple credentials required for full demo)" >&2
    exit 1
  fi
done

export LOG_LEVEL="${LOG_LEVEL:-error}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  StorePilot demo — storepilot-mcp                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "▶ 1/4  storepilot projects"
run_storepilot projects 2>/dev/null
echo ""

echo "▶ 2/4  storepilot snapshot (blockers summary)"
run_storepilot snapshot 2>/dev/null | node -e "
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const j = JSON.parse(Buffer.concat(chunks).toString());
  const s = j.snapshot || {};
  const out = {
    project: j.project,
    ios: s.candidate?.ios
      ? { version: s.candidate.ios.version, state: s.candidate.ios.state }
      : null,
    android: s.candidate?.android
      ? { track: s.candidate.android.track, build: s.candidate.android.versionCodes?.[0] }
      : null,
    blockers: (j.explained?.blockers || []).map((b) => b.message),
    nextActions: (j.explained?.nextActions || []).slice(0, 2).map((a) => a.action + ': ' + a.reason),
  };
  console.log(JSON.stringify(out, null, 2));
});
"
echo ""

echo "▶ 3/4  MCP tools/list (release toolset sample)"
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"1"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' \
  | timeout 10 "${MCP_CMD[@]}" 2>/dev/null \
  | tail -1 \
  | node -e "
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const r = JSON.parse(Buffer.concat(chunks).toString());
  const names = (r.result?.tools || []).map((t) => t.name);
  const highlight = ['execute_release_intent','get_release_snapshot','explain_release_blockers','list_projects'];
  console.log(JSON.stringify({
    server: r.result?.serverInfo || '(see initialize response)',
    toolCount: names.length,
    storepilotTools: highlight.filter((n) => names.includes(n)),
  }, null, 2));
});
"
echo ""

echo "▶ 4/4  execute_release_intent (dryRun — no confirm needed)"
ARGS='{"intent":"configure_rollout","percentage":10,"dryRun":true}'
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"1"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"execute_release_intent","arguments":'"$ARGS"'}}\n' \
  | timeout 25 "${MCP_CMD[@]}" 2>/dev/null \
  | tail -1 \
  | node -e "
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const r = JSON.parse(Buffer.concat(chunks).toString());
  if (r.error) { console.error(r.error); process.exit(1); }
  const j = JSON.parse(r.result.content[0].text);
  console.log(JSON.stringify({
    dryRun: j.data?.dryRun,
    plan: j.data?.plan?.description,
    steps: j.data?.plan?.steps?.length,
  }, null, 2));
});
"

echo ""
echo "✓ Demo complete. See docs/DEMO.md to record a video."
