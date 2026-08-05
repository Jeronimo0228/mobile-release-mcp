#!/usr/bin/env bash
# Resolve StorePilot CLI/MCP bins for demos — always prefer this repo's build.
set -euo pipefail

_demo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

setup_storepilot_demo_bins() {
  local root="${STOREPILOT_ROOT:-$(_demo_root)}"
  if [[ ! -f "$root/dist/index.js" ]] || [[ ! -f "$root/dist/cli.js" ]]; then
    echo "StorePilot not built — run: cd $root && npm run build" >&2
    exit 1
  fi
  # Never use legacy global mobile-release-mcp during demos
  MCP_CMD=(node "$root/dist/index.js")
  export STOREPILOT_ROOT="$root"
}

run_storepilot() {
  local root="${STOREPILOT_ROOT:-$(_demo_root)}"
  node "$root/dist/cli.js" "$@"
}
