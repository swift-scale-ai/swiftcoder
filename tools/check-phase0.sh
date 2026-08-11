#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -x "$ROOT_DIR/.tools/bun" ]]; then
  export PATH="$ROOT_DIR/.tools:$PATH"
fi

node ./tools/verify-baseline.mjs
./tools/check-branding.sh

if rg -n --hidden --glob '!node_modules/**' --glob '!packages/desktop/dist/**' --glob '!packages/desktop/out/**' 'swiftscale[.]ai' . ../swiftcoder-docs; then
  echo "Legacy SwiftScale domain found. Use swift-scale.com." >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun is not installed." >&2
  exit 1
fi

test "$(bun --version)" = "1.3.14"
bun run typecheck
bun test --cwd=packages/desktop \
  src/main/external-url.test.ts \
  src/main/store-cleanup.test.ts \
  src/main/attachment-picker.test.ts
bun test --cwd=packages/app --conditions=solid --preload ./happydom.ts src/pages/layout/helpers.test.ts
SWIFTCODER_CHANNEL=prod SWIFTCODER_VERSION=0.1.0-phase0 bun run build

echo "Phase 0 checks passed."
