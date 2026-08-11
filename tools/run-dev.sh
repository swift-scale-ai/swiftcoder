#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -x "$ROOT_DIR/.tools/bun" ]]; then
  export PATH="$ROOT_DIR/.tools:$PATH"
fi

export SWIFTCODER_CHANNEL="${SWIFTCODER_CHANNEL:-dev}"
export SWIFTCODER_CHANNEL="$SWIFTCODER_CHANNEL"
export SWIFTCODER_VERSION="${SWIFTCODER_VERSION:-0.1.0-phase0}"
exec bun run dev
