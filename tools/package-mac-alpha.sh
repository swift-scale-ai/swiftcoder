#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
DIST="$ROOT/packages/desktop/dist"
VERSION="${SWIFTCODER_VERSION:-0.1.0-alpha.1}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$ ]]; then
  echo "Invalid SWIFTCODER_VERSION: $VERSION" >&2
  exit 1
fi
MACHINE="$(uname -m)"
ARCH="$(if [[ "$MACHINE" == "arm64" ]]; then echo arm64; else echo x64; fi)"
STAGING="$(mktemp -d "${TMPDIR:-/tmp}/swiftcoder-alpha.XXXXXX")"
trap 'rm -rf "$STAGING"' EXIT

export PATH="$ROOT/.tools:$PATH"
export SWIFTCODER_CHANNEL="prod"
export SWIFTCODER_VERSION="$VERSION"
export SWIFTCODER_SKIP_NOTARIZE="1"
export CSC_IDENTITY_AUTO_DISCOVERY="false"

cd "$ROOT"
bun run build
bun run --cwd packages/desktop package:mac:dir

APP="$(find "$DIST" -maxdepth 3 -type d -name 'SwiftCoder.app' -print -quit)"
if [[ -z "$APP" ]]; then
  echo "SwiftCoder.app was not produced in $DIST" >&2
  exit 1
fi

codesign --force --deep --options runtime \
  --entitlements "$ROOT/packages/desktop/resources/entitlements.plist" \
  --sign - --identifier com.swift-scale.swiftcoder "$APP"
codesign --verify --deep --strict "$APP"

ZIP="$DIST/swiftcoder-$VERSION-mac-$ARCH.zip"
DMG="$DIST/swiftcoder-$VERSION-mac-$ARCH.dmg"
METADATA="$DIST/latest-mac.yml"
rm -f "$DIST"/swiftcoder-*.zip "$DIST"/swiftcoder-*.zip.blockmap "$DIST"/swiftcoder-*.dmg "$DIST"/swiftcoder-*.dmg.blockmap "$METADATA"

ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
ditto "$APP" "$STAGING/SwiftCoder.app"
hdiutil create -volname SwiftCoder -srcfolder "$STAGING" -ov -format UDZO "$DMG" >/dev/null

SHA512="$(openssl dgst -sha512 -binary "$ZIP" | openssl base64 -A)"
SIZE="$(stat -f%z "$ZIP")"
RELEASE_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat >"$METADATA" <<EOF
version: $VERSION
files:
  - url: $(basename "$ZIP")
    sha512: $SHA512
    size: $SIZE
path: $(basename "$ZIP")
sha512: $SHA512
releaseDate: '$RELEASE_DATE'
EOF

"$ROOT/tools/check-mac-artifacts.sh" --local "$DIST"
echo "Local Alpha artifacts: $DMG, $ZIP"
