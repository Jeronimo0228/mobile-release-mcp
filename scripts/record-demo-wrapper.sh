#!/usr/bin/env bash
# Loads credentials and runs the console demo (used by record:console:4k).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/.demo-build/demo-env.sh"
bash "$ROOT/scripts/demo-console-4k.sh"
