#!/usr/bin/env bash
# StorePilot 4K console demo — Dracula terminal, full command walkthrough.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACE="${DEMO_PACE:-1.2}"
W="${DEMO_WIDTH:-100}"

# shellcheck source=demo-bin.sh
source "$ROOT/scripts/demo-bin.sh"
setup_storepilot_demo_bins

pause() { sleep "$PACE"; }
pause_long() { sleep "$PACE"; sleep "$PACE"; }

rule() {
  local line
  line=$(printf '%*s' $((W - 2)) '' | tr ' ' '-')
  printf '\033[1;35m%s\033[0m\n' "$line"
}

section() {
  echo ""
  rule
  printf '\033[1;35m  %s\033[0m\n' "$1"
  rule
  echo ""
  pause
}

cmd() {
  echo -e "\033[1;36m$ $*\033[0m"
  pause
}

live() {
  echo -e "\033[1;32m  ● LIVE\033[0m \033[2m$1\033[0m"
  pause
}

typing() {
  local text="$1"
  echo -ne "\033[1;36m$ \033[0m"
  local i c
  for ((i = 0; i < ${#text}; i++)); do
    c="${text:i:1}"
    echo -n "$c"
    sleep 0.04
  done
  echo ""
  pause
}

mcp_call() {
  local tool="$1"
  local args="${2:-{}}"
  printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"1"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"%s","arguments":%s}}\n' \
    "$tool" "$args" \
    | timeout 45 "${MCP_CMD[@]}" 2>/dev/null \
    | tail -1
}

pretty_mcp() {
  node -e "
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const raw = Buffer.concat(chunks).toString().trim();
  if (!raw) { console.error('(no MCP response)'); process.exit(1); }
  const r = JSON.parse(raw);
  if (r.error) { console.error(JSON.stringify(r.error, null, 2)); process.exit(1); }
  const text = r.result?.content?.[0]?.text;
  if (!text) { console.log(JSON.stringify(r.result, null, 2)); return; }
  try {
    const j = JSON.parse(text);
    console.log(JSON.stringify(j.data ?? j, null, 2));
  } catch {
    console.log(text);
  }
});
" || true
}

export LOG_LEVEL="${LOG_LEVEL:-error}"
export MCP_TOOLSET="${MCP_TOOLSET:-release}"

banner_line() {
  local line
  line=$(printf '%*s' $((W - 2)) '' | tr ' ' "$1")
  printf '\033[1;33m%s\033[0m\n' "$line"
}

if [[ -t 1 ]]; then clear || true; fi
printf '\033]0;StorePilot — live release demo\007'

echo ""
banner_line '='
echo -e "\033[1;33m  StorePilot\033[0m — MCP release orchestration for App Store + Google Play"
echo -e "\033[2m  Live demo · blockers first · dry-run always · no production writes\033[0m"
banner_line '='
echo ""
echo -e "\033[1;31m  ● REC\033[0m  \033[2m$(date '+%H:%M:%S') — terminal session\033[0m"
pause
pause

section "Install"
typing "npx -y storepilot-mcp@latest"
echo -e "\033[2m  → StorePilot MCP (npm: storepilot-mcp — replaces mobile-release-mcp)\033[0m"
pause

section "Project profile"
typing "cat storepilot.yaml"
if [[ -f "${STOREPILOT_CONFIG_PATH:-}" ]]; then
  head -n 22 "${STOREPILOT_CONFIG_PATH}"
else
  head -n 22 "$ROOT/storepilot.example.yaml"
fi
pause
pause

section "Environment"
cmd "export STOREPILOT_CONFIG_PATH=./storepilot.yaml"
cmd "export LOG_LEVEL=error MCP_TOOLSET=release"
echo -e "\033[2m  → Apple + Google credentials from ~/.config/mobile-release/\033[0m"
pause

section "CLI — projects"
typing "storepilot projects"
run_storepilot projects 2>/dev/null
pause
pause

section "CLI — release snapshot"
typing "storepilot snapshot"
live "Querying App Store Connect + Google Play…"
run_storepilot snapshot 2>/dev/null | node -e "
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const j = JSON.parse(Buffer.concat(chunks).toString());
  const s = j.snapshot || {};
  console.log(JSON.stringify({
    project: j.project,
    capturedAt: s.capturedAt,
    candidate: s.candidate,
    blockers: s.blockers,
    nextActions: s.nextActions,
    explained: j.explained,
  }, null, 2));
});
" || echo "(snapshot unavailable)"
pause
pause_long

section "MCP — orchestrator tools"
cmd "storepilot-mcp  # tools/list"
live "MCP handshake + release toolset"
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"1"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' \
  | timeout 15 "${MCP_CMD[@]}" 2>/dev/null \
  | tail -1 \
  | node -e "
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const r = JSON.parse(Buffer.concat(chunks).toString());
  const tools = (r.result?.tools || []).map((t) => t.name);
  const core = ['list_projects','get_release_snapshot','explain_release_blockers','execute_release_intent'];
  console.log(JSON.stringify({
    server: 'storepilot-mcp',
    toolCount: tools.length,
    orchestratorTools: core.filter((n) => tools.includes(n)),
  }, null, 2));
});
" || true
pause
pause

section "MCP — get_release_snapshot"
typing "get_release_snapshot"
live "Cross-platform release snapshot"
mcp_call get_release_snapshot | pretty_mcp
pause
pause

section "MCP — explain_release_blockers"
typing "explain_release_blockers"
live "Blocker analysis for agent"
mcp_call explain_release_blockers | pretty_mcp
pause
pause

section "MCP — dry-run rollout"
typing 'execute_release_intent intent=configure_rollout percentage=10 dryRun=true'
live "Planning staged rollout (dry-run)"
mcp_call execute_release_intent '{"intent":"configure_rollout","percentage":10,"dryRun":true}' | pretty_mcp
pause
pause_long

section "MCP — dry-run promote"
typing 'execute_release_intent intent=promote_to_production dryRun=true'
live "Planning production promote (dry-run)"
mcp_call execute_release_intent '{"intent":"promote_to_production","dryRun":true}' | pretty_mcp
pause
pause_long

section "Agent workflow"
echo -e "\033[1;37m  In Cursor / Claude after MCP connect:\033[0m"
echo ""
echo "    1. load_project"
echo "    2. explain_release_blockers"
echo "    3. execute_release_intent — rollout 10% — dryRun: true"
echo ""
pause

section "Done"
echo -e "\033[1;32m  ✓ Demo complete — read-only + dry-run only\033[0m"
echo ""
echo "  npm   https://www.npmjs.com/package/storepilot-mcp"
echo "  repo  https://github.com/Jeronimo0228/StorePilot"
echo ""
pause

if [[ -n "${DEMO_RECORDING:-}" ]]; then
  echo -e "\033[2m  storepilot-mcp\033[0m"
  sleep 12
fi
