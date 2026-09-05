#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CORE_ROOT="$ROOT/../swiftcore"
BUN="$ROOT/.tools/bun"

"$ROOT/tools/check-phase0.sh"
(cd "$ROOT/packages/desktop" && "$BUN" test \
  src/main/swiftscale-auth-contract.test.ts \
  src/main/keychain.test.ts \
  src/main/swiftscale-auth.test.ts \
  src/main/window-state.test.ts \
  ../../tools/mock-swiftscale.test.ts)
(cd "$ROOT/packages/opencode" && "$BUN" test \
  src/provider/error-swiftscale.test.ts \
  src/provider/swiftscale-base-url.test.ts \
  src/auth/macos-keychain.test.ts)
(cd "$CORE_ROOT/packages/core" && XDG_STATE_HOME="$ROOT/.tmp/test-state" XDG_DATA_HOME="$ROOT/.tmp/test-data" "$BUN" test src/observability/logging.test.ts)
node --test "$ROOT/tools/responses-production-probe.test.mjs"

echo "Phase 1 foundation checks passed"
