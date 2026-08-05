#!/usr/bin/env bash
# Build fullscreen 4K console demo: asciinema → agg → MP4 + preview GIF.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/docs/assets"
BUILD_DIR="$ROOT/.demo-build"
ENV_FILE="$BUILD_DIR/demo-env.sh"
CAST="$BUILD_DIR/demo.cast"
GIF="$BUILD_DIR/demo-full.gif"
MP4="$OUT_DIR/storepilot-console-4k.mp4"
PREVIEW="$OUT_DIR/storepilot-console-4k-preview.gif"
WRAPPER="$ROOT/scripts/record-demo-wrapper.sh"

# Terminal geometry tuned for 3840×2160 fullscreen (agg font-size × cols ≈ width)
COLS=118
ROWS=42
FONT=34

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing dependency: $1" >&2
    exit 1
  }
}

ensure_agg() {
  if command -v agg >/dev/null 2>&1; then return; fi
  local bin="$ROOT/.demo-build/agg"
  if [[ -x "$bin" ]]; then
    export PATH="$ROOT/.demo-build:$PATH"
    return
  fi
  echo "Downloading agg v1.9.0..."
  curl -fsSL -o "$bin" \
    "https://github.com/asciinema/agg/releases/download/v1.9.0/agg-x86_64-unknown-linux-gnu"
  chmod +x "$bin"
  export PATH="$ROOT/.demo-build:$PATH"
}

need asciinema
need curl
need ffmpeg
need node
ensure_agg

for var in APPLE_KEY_ID APPLE_ISSUER_ID APPLE_PRIVATE_KEY_PATH STOREPILOT_CONFIG_PATH; do
  if [[ -z "${!var:-}" ]]; then
    echo "Set $var before recording (see docs/CREDENTIALS.md)" >&2
    exit 1
  fi
done

cd "$ROOT"
npm run build >/dev/null
mkdir -p "$OUT_DIR" "$BUILD_DIR"
chmod +x "$WRAPPER" "$ROOT/scripts/demo-console-4k.sh"

cat >"$ENV_FILE" <<EOF
export APPLE_KEY_ID=$(printf '%q' "$APPLE_KEY_ID")
export APPLE_ISSUER_ID=$(printf '%q' "$APPLE_ISSUER_ID")
export APPLE_PRIVATE_KEY_PATH=$(printf '%q' "$APPLE_PRIVATE_KEY_PATH")
export STOREPILOT_CONFIG_PATH=$(printf '%q' "$STOREPILOT_CONFIG_PATH")
export LOG_LEVEL=error
export MCP_TOOLSET=release
export DEMO_PACE=1.8
export DEMO_WIDTH=$COLS
export DEMO_RECORDING=1
export TERM=xterm-256color
export PATH=$(printf '%q' "$ROOT/node_modules/.bin:${PATH:-/usr/bin:/bin}")
EOF

if [[ -n "${GOOGLE_SERVICE_ACCOUNT_KEY_PATH:-}" ]]; then
  echo "export GOOGLE_SERVICE_ACCOUNT_KEY_PATH=$(printf '%q' "$GOOGLE_SERVICE_ACCOUNT_KEY_PATH")" >>"$ENV_FILE"
fi

echo "Recording live terminal session (asciinema)..."
echo "  ${COLS}×${ROWS} · ~2–3 min real-time"
rm -f "$CAST" "$GIF" "$MP4" "$PREVIEW"

asciinema rec -y "$CAST" \
  -c "bash $WRAPPER" \
  --cols "$COLS" \
  --rows "$ROWS"

echo "Rendering terminal animation (agg)..."
agg "$CAST" "$GIF" \
  --cols "$COLS" \
  --rows "$ROWS" \
  --font-size "$FONT" \
  --line-height 1.28 \
  --font-family "JetBrains Mono,Source Code Pro,Fira Code,Consolas,DejaVu Sans Mono" \
  --theme dracula \
  --renderer resvg \
  --speed 1.0 \
  --idle-time-limit 999 \
  --fps-cap 24

echo "Creating fullscreen 4K MP4..."
ffmpeg -y -i "$GIF" \
  -vf "scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,setsar=1,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -movflags +faststart \
  "$MP4" 2>/dev/null

echo "Creating preview GIF (1280px, 15fps)..."
ffmpeg -y -i "$GIF" \
  -vf "fps=15,scale=1280:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
  -loop 0 "$PREVIEW" 2>/dev/null

DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$MP4" 2>/dev/null || echo "?")
echo ""
echo "Done. Duration: ${DUR}s · ${COLS}×${ROWS} → 3840×2160 fullscreen"
ls -lh "$MP4" "$PREVIEW" "$CAST"
