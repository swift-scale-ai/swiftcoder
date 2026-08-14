#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -x "$ROOT_DIR/.tools/bun" ]]; then
  export PATH="$ROOT_DIR/.tools:$PATH"
fi

DIST_DIR="$ROOT_DIR/packages/desktop/dist/mac-arm64"
RUNNING_APP_PATTERN="$DIST_DIR/SwiftCoder.*\\.app/Contents/MacOS/SwiftCoder(_Dev)?"

if pgrep -f "$RUNNING_APP_PATTERN" >/dev/null 2>&1; then
  echo "Stopping the running SwiftCoder development app before packaging..."
  pkill -TERM -f "$RUNNING_APP_PATTERN"
  for _ in {1..50}; do
    if ! pgrep -f "$RUNNING_APP_PATTERN" >/dev/null 2>&1; then
      break
    fi
    sleep 0.1
  done
  if pgrep -f "$RUNNING_APP_PATTERN" >/dev/null 2>&1; then
    echo "The development app did not exit cleanly; forcing the stale process to stop..."
    pkill -KILL -f "$RUNNING_APP_PATTERN"
  fi
fi

export SWIFTCODER_CHANNEL="dev"
export SWIFTCODER_VERSION="0.2.5-dev"
export SWIFTCODER_SKIP_NOTARIZE="1"
export CSC_IDENTITY_AUTO_DISCOVERY="false"

# Development packages are ad-hoc signed below. Do not let release signing
# variables inherited from the shell make electron-builder import a certificate.
unset CSC_LINK CSC_KEY_PASSWORD CSC_NAME

bun run build
bun run --cwd packages/desktop package:mac:dir

APP_PATH="$DIST_DIR/SwiftCoder_Dev.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "Expected app was not created at $APP_PATH" >&2
  exit 1
fi

codesign --force --deep --sign - --identifier com.swift-scale.swiftcoder.dev "$APP_PATH"
codesign --verify --deep --strict "$APP_PATH"

echo "Development app: $APP_PATH"
