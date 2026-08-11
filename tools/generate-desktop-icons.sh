#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SOURCE="$ROOT/packages/desktop/icons/source/logo.png"

if [[ ! -f "$SOURCE" ]]; then
  echo "SwiftCoder icon source is missing: $SOURCE" >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to generate high-quality RGBA icon assets" >&2
  exit 1
fi

width="$(sips -g pixelWidth "$SOURCE" 2>/dev/null | awk '/pixelWidth/ { print $2 }')"
height="$(sips -g pixelHeight "$SOURCE" 2>/dev/null | awk '/pixelHeight/ { print $2 }')"
if [[ "$width" != "$height" || "$width" -lt 1024 ]]; then
  echo "SwiftCoder icon source must be square and at least 1024px; got ${width}x${height}" >&2
  exit 1
fi

resize() {
  local size="$1"
  local output="$2"
  ffmpeg -hide_banner -loglevel error -y -i "$SOURCE" \
    -vf "scale=${size}:${size}:flags=lanczos,format=rgba" \
    -frames:v 1 "$output"
}

for channel in dev beta prod; do
  target="$ROOT/packages/desktop/icons/$channel"

  # Re-render every existing raster target directly from the master image.
  while IFS= read -r output; do
    target_width="$(sips -g pixelWidth "$output" 2>/dev/null | awk '/pixelWidth/ { print $2 }')"
    target_height="$(sips -g pixelHeight "$output" 2>/dev/null | awk '/pixelHeight/ { print $2 }')"
    if [[ "$target_width" != "$target_height" ]]; then
      echo "Skipping non-square icon target: $output" >&2
      continue
    fi
    resize "$target_width" "$output"
  done < <(find "$target" -type f -name '*.png' | sort)

  iconset="$(mktemp -d "${TMPDIR:-/tmp}/swiftcoder-iconset.XXXXXX")/SwiftCoder.iconset"
  mkdir -p "$iconset"
  resize 16 "$iconset/icon_16x16.png"
  resize 32 "$iconset/icon_16x16@2x.png"
  resize 32 "$iconset/icon_32x32.png"
  resize 64 "$iconset/icon_32x32@2x.png"
  resize 128 "$iconset/icon_128x128.png"
  resize 256 "$iconset/icon_128x128@2x.png"
  resize 256 "$iconset/icon_256x256.png"
  resize 512 "$iconset/icon_256x256@2x.png"
  resize 512 "$iconset/icon_512x512.png"
  resize 1024 "$iconset/icon_512x512@2x.png"
  node "$ROOT/tools/build-icns.mjs" "$iconset" "$target/icon.icns"
  rm -rf "$(dirname "$iconset")"
done

echo "SwiftCoder desktop icons generated from $SOURCE"
