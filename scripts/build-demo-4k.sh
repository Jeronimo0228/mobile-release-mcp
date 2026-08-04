#!/usr/bin/env bash
# Build StorePilot 4K demo: terminal (VHS) + App Store / Play Console mockups (Chromium).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/docs/assets"
MOCKUPS="$ASSETS/mockups"
WORK="$ASSETS/.demo-build"
FPS=30

mkdir -p "$WORK" "$ASSETS"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
need ffmpeg
need chromium-browser
need vhs
need ttyd

shot() {
  local html="$1" out="$2"
  chromium-browser --headless --disable-gpu --hide-scrollbars \
    --window-size=3840,2160 --screenshot="$out" "file://$html" 2>/dev/null
  echo "  screenshot $out"
}

img_to_clip() {
  local img="$1" out="$2" dur="$3" label="$4"
  local fade_out
  fade_out=$(awk -v d="$dur" 'BEGIN{printf "%.2f", d-0.5}')
  ffmpeg -y -loop 1 -i "$img" \
    -vf "scale=3840:2160:force_original_aspect_ratio=decrease,pad=3840:2160:(ow-iw)/2:(oh-ih)/2,format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=${fade_out}:d=0.5,drawtext=text=${label}:fontsize=42:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=16:x=80:y=h-120" \
    -t "$dur" -r "$FPS" -c:v libx264 -pix_fmt yuv420p -crf 18 "$out" 2>/dev/null
}

echo "=== 1/4 Mockup screenshots (3840×2160) ==="
shot "$MOCKUPS/title-card.html" "$WORK/00-title.png"
shot "$MOCKUPS/app-store-connect-before.html" "$WORK/01-asc-before.png"
shot "$MOCKUPS/google-play-before.html" "$WORK/02-play-before.png"
shot "$MOCKUPS/app-store-connect-after.html" "$WORK/03-asc-after.png"
shot "$MOCKUPS/google-play-after.html" "$WORK/04-play-after.png"

echo "=== 2/4 Terminal recording (4K VHS) ==="
if [[ -z "${STOREPILOT_CONFIG_PATH:-}" ]]; then
  echo "Warning: STOREPILOT_CONFIG_PATH not set — terminal segment may fail" >&2
fi
export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
export LOG_LEVEL="${LOG_LEVEL:-error}"
cd "$ROOT"
vhs docs/storepilot-demo-4k.tape
# VHS outputs mp4 when Output ends with .mp4
if [[ ! -f "$ASSETS/storepilot-terminal-4k.mp4" ]]; then
  echo "VHS did not produce terminal mp4" >&2
  exit 1
fi

echo "=== 3/4 Image clips ==="
img_to_clip "$WORK/00-title.png" "$WORK/c00.mp4" 6 "StorePilot"
img_to_clip "$WORK/01-asc-before.png" "$WORK/c01.mp4" 12 "App Store Connect - before"
img_to_clip "$WORK/02-play-before.png" "$WORK/c02.mp4" 12 "Google Play Console - before"
img_to_clip "$WORK/03-asc-after.png" "$WORK/c03.mp4" 10 "App Store Connect - after"
img_to_clip "$WORK/04-play-after.png" "$WORK/c04.mp4" 10 "Google Play Console - after"

# Normalize terminal clip to 4K h264
ffmpeg -y -i "$ASSETS/storepilot-terminal-4k.mp4" \
  -vf "scale=3840:2160:force_original_aspect_ratio=decrease,pad=3840:2160:(ow-iw)/2:(oh-ih)/2,format=yuv420p" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p "$WORK/terminal-4k.mp4" 2>/dev/null

echo "=== 4/4 Concatenate final 4K video ==="
cat > "$WORK/concat.txt" <<EOF
file '$WORK/c00.mp4'
file '$WORK/terminal-4k.mp4'
file '$WORK/c01.mp4'
file '$WORK/c02.mp4'
file '$WORK/c03.mp4'
file '$WORK/c04.mp4'
EOF

ffmpeg -y -f concat -safe 0 -i "$WORK/concat.txt" -c copy "$ASSETS/storepilot-demo-4k.mp4" 2>/dev/null

# LinkedIn GIF (720p proxy from 4K, shorter)
ffmpeg -y -i "$ASSETS/storepilot-demo-4k.mp4" -vf "fps=15,scale=1280:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -t 90 "$ASSETS/storepilot-demo-4k.gif" 2>/dev/null

# Replace primary assets for README (keep 720p gif for web weight)
ffmpeg -y -i "$ASSETS/storepilot-demo-4k.mp4" -vf "scale=1280:-1" -c:v libx264 -crf 23 \
  "$ASSETS/storepilot-demo.mp4" 2>/dev/null
ffmpeg -y -i "$ASSETS/storepilot-demo.mp4" -vf "fps=12,scale=1280:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  "$ASSETS/storepilot-demo.gif" 2>/dev/null

ls -lh "$ASSETS"/storepilot-demo-4k.*
echo ""
echo "Done:"
echo "  4K master: $ASSETS/storepilot-demo-4k.mp4"
echo "  4K GIF:    $ASSETS/storepilot-demo-4k.gif"
echo "  Web MP4:   $ASSETS/storepilot-demo.mp4"
