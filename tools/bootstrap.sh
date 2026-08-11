#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -x "$ROOT_DIR/.tools/bun" ]]; then
  export PATH="$ROOT_DIR/.tools:$PATH"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun 1.3.14 is required. Install Bun, then rerun this script." >&2
  exit 1
fi

if [[ "$(bun --version)" != "1.3.14" ]]; then
  echo "Expected Bun 1.3.14, found $(bun --version)." >&2
  exit 1
fi

bun install

ELECTRON_APP="$ROOT_DIR/packages/desktop/node_modules/electron/dist/Electron.app"
if [[ ! -d "$ELECTRON_APP" ]]; then
  bun "$ROOT_DIR/packages/desktop/node_modules/electron/install.js"
fi
