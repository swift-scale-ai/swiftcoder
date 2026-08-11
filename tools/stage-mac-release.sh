#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CHANNEL="${1:-}"
DIST="${2:-$ROOT/packages/desktop/dist}"
WEB_ROOT="${SWIFTCODER_WEB_ROOT:-$ROOT/../swiftcoder-web}"

if [[ "$CHANNEL" != "beta" && "$CHANNEL" != "prod" ]]; then
  echo "Usage: $0 beta|prod [artifact-directory]" >&2
  exit 1
fi
if [[ ! -f "$WEB_ROOT/package.json" || ! -d "$WEB_ROOT/public" ]]; then
  echo "SwiftCoder Web checkout not found: $WEB_ROOT" >&2
  exit 1
fi

"$ROOT/tools/check-mac-artifacts.sh" "$DIST"

METADATA="$DIST/latest-mac.yml"
VERSION="$(sed -n 's/^version:[[:space:]]*//p' "$METADATA" | head -1 | tr -d "'\"")"
ZIP_NAME="$(sed -n 's/^path:[[:space:]]*//p' "$METADATA" | head -1 | tr -d "'\"")"
if [[ -z "$VERSION" || -z "$ZIP_NAME" || "$ZIP_NAME" != "$(basename "$ZIP_NAME")" || "$ZIP_NAME" != *.zip ]]; then
  echo "Invalid update manifest" >&2
  exit 1
fi

ZIP="$DIST/$ZIP_NAME"
DMG="$DIST/${ZIP_NAME%.zip}.dmg"
BLOCKMAP="$ZIP.blockmap"
DEST="$WEB_ROOT/public/releases/$CHANNEL"
mkdir -p "$DEST"
STAGING="$(mktemp -d "$DEST/.stage.XXXXXX")"
trap 'rm -rf "$STAGING"' EXIT

stage_immutable() {
  local source="$1"
  local name
  name="$(basename "$source")"
  if [[ -e "$DEST/$name" ]]; then
    if cmp -s "$source" "$DEST/$name"; then
      return
    fi
    echo "Refusing to overwrite immutable release artifact: $DEST/$name" >&2
    exit 1
  fi
  cp "$source" "$STAGING/$name"
}

stage_immutable "$ZIP"
stage_immutable "$BLOCKMAP"
stage_immutable "$DMG"
for artifact in "$STAGING"/*; do
  [[ -e "$artifact" ]] || continue
  mv "$artifact" "$DEST/"
done

# Publish the mutable channel pointer only after every immutable artifact is in place.
cp "$METADATA" "$STAGING/latest-mac.yml"
mv "$STAGING/latest-mac.yml" "$DEST/latest-mac.yml"

echo "Staged SwiftCoder $CHANNEL $VERSION for the next SwiftScale Web deployment: $DEST"
