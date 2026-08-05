#!/usr/bin/env bash
# Build 4K Dracula console demo: asciinema live session → agg → fullscreen MP4.
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

# Dracula @ native ~4K — purple terminal, full cols visible
COLS=100
ROWS=40
FONT=58
FPS=30
CANVAS_W=3840
CANVAS_H=2160
CRF=11
X264_PRESET=veryslow

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

compose_mp4() {
  local tmp="$BUILD_DIR/demo-4k.tmp.mp4"
  local gw gh
  gw=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$GIF")
  gh=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$GIF")
  echo "4K fullscreen Dracula: ${gw}×${gh} → ${CANVAS_W}×${CANVAS_H}"

  ffmpeg -y -i "$GIF" \
    -vf "scale=${CANVAS_W}:${CANVAS_H}:force_original_aspect_ratio=increase:flags=lanczos+accurate_rnd+full_chroma_int,crop=${CANVAS_W}:${CANVAS_H},setsar=1,unsharp=5:5:0.45:5:5:0.0" \
    -r "$FPS" \
    -c:v libx264 -preset "$X264_PRESET" -crf "$CRF" -profile:v high -pix_fmt yuv420p \
    -x264-params "ref=6:bframes=8:aq-mode=3" \
    -movflags +faststart \
    "$tmp"

  ffprobe -v error "$tmp" >/dev/null
  mv -f "$tmp" "$MP4"
}

compose_preview() {
  local tmp="$BUILD_DIR/demo-preview.tmp.gif"
  ffmpeg -y -i "$MP4" \
    -vf "fps=20,scale=1280:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer:bayer_scale=2" \
    -loop 0 "$tmp" 2>/dev/null
  ffprobe -v error "$tmp" >/dev/null
  mv -f "$tmp" "$PREVIEW"
}

need asciinema
need curl
need ffmpeg
need node
ensure_agg

MODE=${1:-full}

if [[ "$MODE" == "compose" ]]; then
  [[ -f "$GIF" ]] || { echo "Missing $GIF" >&2; exit 1; }
  compose_mp4
  compose_preview
  ls -lh "$MP4" "$PREVIEW"
  exit 0
fi

for var in APPLE_KEY_ID APPLE_ISSUER_ID APPLE_PRIVATE_KEY_PATH STOREPILOT_CONFIG_PATH; do
  if [[ "$MODE" == "full" ]] && [[ -z "${!var:-}" ]]; then
    echo "Set $var before recording (see docs/CREDENTIALS.md)" >&2
    exit 1
  fi
done

cd "$ROOT"
npm run build >/dev/null
mkdir -p "$OUT_DIR" "$BUILD_DIR"
chmod +x "$WRAPPER" "$ROOT/scripts/demo-console-4k.sh"

if [[ "$MODE" == "full" ]]; then
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
export STOREPILOT_ROOT=$(printf '%q' "$ROOT")
export PATH=$(printf '%q' "$ROOT/node_modules/.bin:/usr/bin:/bin")
EOF
  if [[ -n "${GOOGLE_SERVICE_ACCOUNT_KEY_PATH:-}" ]]; then
    echo "export GOOGLE_SERVICE_ACCOUNT_KEY_PATH=$(printf '%q' "$GOOGLE_SERVICE_ACCOUNT_KEY_PATH")" >>"$ENV_FILE"
  fi

  echo "Recording Dracula terminal demo (asciinema)..."
  echo "  ${COLS}×${ROWS} · font ${FONT}px · theme dracula"
  rm -f "$CAST" "$GIF" "$MP4" "$PREVIEW"
  asciinema rec -y "$CAST" \
    -c "bash $WRAPPER" \
    --cols "$COLS" \
    --rows "$ROWS"
elif [[ "$MODE" == "render" ]]; then
  [[ -f "$CAST" ]] || { echo "Missing cast" >&2; exit 1; }
  echo "Re-render from: $CAST"
else
  echo "Usage: $0 [full|render|compose]" >&2
  exit 1
fi

echo "Rendering agg (dracula, ${FONT}px)..."
agg "$CAST" "$GIF" \
  --cols "$COLS" \
  --rows "$ROWS" \
  --font-size "$FONT" \
  --line-height 1.18 \
  --font-family "JetBrains Mono,Source Code Pro,Fira Code,Consolas,DejaVu Sans Mono" \
  --theme dracula \
  --renderer resvg \
  --speed 1.0 \
  --idle-time-limit 999 \
  --fps-cap "$FPS"

compose_mp4
compose_preview

DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$MP4" 2>/dev/null || echo "?")
echo ""
echo "Done. ${DUR}s · dracula ${COLS}×${ROWS} · ${CANVAS_W}×${CANVAS_H}"
ls -lh "$MP4" "$PREVIEW" "$CAST"
