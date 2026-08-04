#!/usr/bin/env bash
# First-time StorePilot trial — for external testers (5–10 min).
# Does NOT write to any store. Read-only + dry-run only.

set -euo pipefail

echo "StorePilot trial kit"
echo "===================="
echo ""

missing=0
check() {
  if [[ -z "${!1:-}" ]]; then
    echo "  ✗ $1 not set"
    missing=1
  else
    echo "  ✓ $1"
  fi
}

check APPLE_KEY_ID
check APPLE_ISSUER_ID
check APPLE_PRIVATE_KEY_PATH
check STOREPILOT_CONFIG_PATH

if [[ ! -f "${STOREPILOT_CONFIG_PATH:-/nonexistent}" ]]; then
  echo "  ✗ storepilot.yaml not found at STOREPILOT_CONFIG_PATH"
  missing=1
else
  echo "  ✓ storepilot.yaml exists"
fi

if [[ $missing -eq 1 ]]; then
  echo ""
  echo "Setup: copy storepilot.example.yaml → storepilot.yaml and set env vars."
  echo "Docs: https://github.com/Jeronimo0228/StorePilot/blob/master/docs/CREDENTIALS.md"
  exit 1
fi

export LOG_LEVEL=error
export MCP_TOOLSET=release

echo ""
echo "Running read-only checks..."
echo ""

echo "1. Project registry"
storepilot projects 2>/dev/null
echo ""

echo "2. Release snapshot"
storepilot snapshot 2>/dev/null | head -c 4000
echo ""
echo ""

echo "3. Dry-run rollout intent (no store changes)"
ARGS='{"intent":"configure_rollout","percentage":10,"dryRun":true}'
out=$(printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"trial","version":"1"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"execute_release_intent","arguments":'"$ARGS"'}}\n' \
  | timeout 30 storepilot-mcp 2>/dev/null | tail -1)

echo "$out" | node -e "
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const r = JSON.parse(Buffer.concat(chunks).toString());
  if (r.error) { console.error('FAIL:', r.error.message); process.exit(1); }
  const j = JSON.parse(r.result.content[0].text);
  if (!j.success || !j.data?.dryRun) { console.error('FAIL: expected dryRun success'); process.exit(1); }
  console.log('OK: dry-run plan —', j.data.plan.description);
});
"

echo ""
echo "Trial passed. Share feedback:"
echo "  https://github.com/Jeronimo0228/StorePilot/issues/new?template=try-storepilot.yml"
