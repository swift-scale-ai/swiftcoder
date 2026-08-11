#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
MODE="release"
DIST="$ROOT/packages/desktop/dist"

if [[ "${1:-}" == "--local" ]]; then
  MODE="local"
  shift
fi
if [[ $# -gt 0 ]]; then
  DIST="$1"
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "macOS artifact verification must run on macOS" >&2
  exit 1
fi

APP="$(find "$DIST" -maxdepth 3 -type d -name 'SwiftCoder*.app' -print -quit)"
METADATA="$(find "$DIST" -maxdepth 1 -type f -name 'latest-mac.yml' -print -quit)"

for item in APP METADATA; do
  if [[ -z "${!item}" ]]; then
    echo "Missing $item artifact in $DIST" >&2
    exit 1
  fi
done

MANIFEST_PATH="$(sed -n 's/^path:[[:space:]]*//p' "$METADATA" | head -1 | tr -d "'\"")"
if [[ -z "$MANIFEST_PATH" || "$MANIFEST_PATH" != "$(basename "$MANIFEST_PATH")" || "$MANIFEST_PATH" != *.zip ]]; then
  echo "Invalid ZIP path in update manifest" >&2
  exit 1
fi
ZIP="$DIST/$MANIFEST_PATH"
DMG="${ZIP%.zip}.dmg"
for item in DMG ZIP; do
  if [[ ! -f "${!item}" ]]; then
    echo "Missing $item artifact in $DIST" >&2
    exit 1
  fi
done

codesign --verify --deep --strict "$APP"
identifier="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist")"
if [[ ! "$identifier" =~ ^com\.swift-scale\.swiftcoder(\.beta|\.dev)?$ ]]; then
  echo "Unexpected bundle identifier: $identifier" >&2
  exit 1
fi

ASAR="$APP/Contents/Resources/app.asar"
ASAR_MODULE="$(find "$ROOT/node_modules/.bun" -path '*/node_modules/@electron/asar/lib/asar.js' -print -quit)"
if [[ ! -f "$ASAR" || -z "$ASAR_MODULE" ]]; then
  echo "Unable to inspect packaged runtime dependencies" >&2
  exit 1
fi
node --input-type=module -e '
  import { pathToFileURL } from "node:url"
  const modulePath = process.argv[1]
  const archivePath = process.argv[2]
  const required = process.argv.slice(3)
  const { listPackage } = await import(pathToFileURL(modulePath).href)
  const packaged = new Set(listPackage(archivePath))
  const missing = required.filter((path) => !packaged.has(path))
  if (missing.length) {
    console.error(`Missing packaged runtime dependencies:\n${missing.join("\n")}`)
    process.exit(1)
  }
' "$ASAR_MODULE" "$ASAR" \
  /node_modules/@lydell/node-pty/package.json \
  /node_modules/@lydell/node-pty/index.js \
  /node_modules/@zip.js/zip.js/package.json \
  /node_modules/drizzle-orm/package.json \
  /node_modules/effect/package.json \
  /node_modules/electron-context-menu/package.json \
  /node_modules/electron-log/package.json \
  /node_modules/electron-store/package.json \
  /node_modules/electron-updater/package.json \
  /node_modules/electron-window-state/package.json \
  /node_modules/esprima/package.json \
  /node_modules/esprima/dist/esprima.js \
  /node_modules/jsonc-parser/package.json \
  /node_modules/jsonc-parser/lib/esm/main.js

case "$(uname -m)" in
  arm64) PTY_ARCH="arm64" ;;
  x86_64) PTY_ARCH="x64" ;;
  *) echo "Unsupported macOS architecture: $(uname -m)" >&2; exit 1 ;;
esac
PTY_NATIVE="$APP/Contents/Resources/app.asar.unpacked/node_modules/@lydell/node-pty-darwin-$PTY_ARCH/prebuilds/darwin-$PTY_ARCH/pty.node"
if [[ ! -f "$PTY_NATIVE" ]]; then
  echo "Missing packaged node-pty native module: $PTY_NATIVE" >&2
  exit 1
fi
WATCHER_NATIVE="$APP/Contents/Resources/app.asar.unpacked/node_modules/@parcel/watcher-darwin-$PTY_ARCH/watcher.node"
if [[ ! -f "$WATCHER_NATIVE" ]]; then
  echo "Missing packaged file-watcher native module: $WATCHER_NATIVE" >&2
  exit 1
fi
MSGPACKR_DIR="$APP/Contents/Resources/app.asar.unpacked/node_modules/@msgpackr-extract/msgpackr-extract-darwin-$PTY_ARCH"
MSGPACKR_NATIVE="$(find "$MSGPACKR_DIR" -maxdepth 1 -type f -name '*.node' -print -quit 2>/dev/null || true)"
if [[ -z "$MSGPACKR_NATIVE" ]]; then
  echo "Missing packaged msgpackr native module in: $MSGPACKR_DIR" >&2
  exit 1
fi

hdiutil verify "$DMG" >/dev/null
unzip -tq "$ZIP"
rg -q 'url: .*\.zip' "$METADATA"
rg -q '^sha512: ' "$METADATA"

VERSION="$(sed -n 's/^version:[[:space:]]*//p' "$METADATA" | head -1 | tr -d "'\"")"
MANIFEST_SHA512="$(sed -n 's/^sha512:[[:space:]]*//p' "$METADATA" | tail -1 | tr -d "'\"")"
MANIFEST_SIZE="$(sed -n 's/^[[:space:]]*size:[[:space:]]*//p' "$METADATA" | head -1 | tr -d "'\"")"
ZIP_NAME="$(basename "$ZIP")"
DMG_NAME="$(basename "$DMG")"

if [[ -z "$VERSION" || "$ZIP_NAME" != "$MANIFEST_PATH" ]]; then
  echo "Update manifest does not reference the verified ZIP" >&2
  exit 1
fi
if [[ "$ZIP_NAME" != *"-$VERSION-"* || "$DMG_NAME" != *"-$VERSION-"* ]]; then
  echo "Release artifacts must include version $VERSION in their filenames" >&2
  exit 1
fi

ACTUAL_SHA512="$(openssl dgst -sha512 -binary "$ZIP" | openssl base64 -A)"
ACTUAL_SIZE="$(stat -f%z "$ZIP")"
if [[ "$MANIFEST_SHA512" != "$ACTUAL_SHA512" || "$MANIFEST_SIZE" != "$ACTUAL_SIZE" ]]; then
  echo "Update manifest checksum or size does not match the verified ZIP" >&2
  exit 1
fi

MOUNT="$(mktemp -d "${TMPDIR:-/tmp}/swiftcoder-dmg.XXXXXX")"
cleanup_mount() {
  hdiutil detach "$MOUNT" -quiet >/dev/null 2>&1 || true
  rmdir "$MOUNT" >/dev/null 2>&1 || true
}
trap cleanup_mount EXIT
hdiutil attach "$DMG" -nobrowse -readonly -mountpoint "$MOUNT" >/dev/null
MOUNTED_APP="$(find "$MOUNT" -maxdepth 1 -type d -name 'SwiftCoder*.app' -print -quit)"
if [[ -z "$MOUNTED_APP" ]]; then
  echo "DMG does not contain SwiftCoder.app" >&2
  exit 1
fi
codesign --verify --deep --strict "$MOUNTED_APP"
cleanup_mount
trap - EXIT

if [[ "$MODE" == "release" ]]; then
  if [[ ! -f "$ZIP.blockmap" ]]; then
    echo "Missing ZIP blockmap: $ZIP.blockmap" >&2
    exit 1
  fi
  details="$(codesign -dv --verbose=4 "$APP" 2>&1)"
  if [[ "$details" != *"Authority=Developer ID Application:"* || "$details" == *"Signature=adhoc"* ]]; then
    echo "App is not signed with Developer ID Application" >&2
    exit 1
  fi
  spctl --assess --type execute --verbose=2 "$APP"
  xcrun stapler validate "$APP"
  xcrun stapler validate "$DMG"
fi

echo "SwiftCoder $MODE macOS artifacts passed integrity checks"
