#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BUN="$ROOT/.tools/bun"

"$ROOT/tools/check-phase3.sh"

(cd "$ROOT/packages/desktop" && "$BUN" test \
  src/main/swiftscale-auth-contract.test.ts \
  src/main/swiftscale-auth.test.ts \
  src/main/product-analytics.test.ts \
  src/main/ipc-contract.test.ts \
  ../../tools/mock-swiftscale.test.ts)
(cd "$ROOT/packages/opencode" && "$BUN" test src/provider/error-swiftscale.test.ts)
(cd "$ROOT/packages/app" && "$BUN" test --conditions=solid --preload ./happydom.ts \
  src/pages/layout/helpers.test.ts \
  src/pages/layout/account-summary.test.ts)
(cd "$ROOT" && node --test tools/phase4-production-probe.test.mjs)
(cd "$ROOT/packages/desktop" && "$BUN" test ../../tools/phase4-kpi.test.ts)
(cd "$ROOT" && node tools/check-open-source-readiness.mjs)

if rg -n 'swiftscale\.ai|opencode\.ai' \
  "$ROOT/packages/app/src/components/dialog-swiftscale-account.tsx" \
  "$ROOT/packages/desktop/src/main/swiftscale-auth-contract.ts"; then
  echo "Phase 4 account surfaces contain a non-SwiftScale production domain" >&2
  exit 1
fi

if ! rg -q 'swiftcoder://billing/complete' "$ROOT/tools/check-desktop-runtime.mjs"; then
  echo "SwiftScale billing completion deep-link is not covered by the runtime gate" >&2
  exit 1
fi

if ! rg -q 'https://swift-scale\.com/console/\?service=coding_plan&view=billing' \
  "$ROOT/packages/app/src/components/dialog-swiftscale-account.tsx"; then
  echo "SwiftScale billing entry is not fixed to the product domain" >&2
  exit 1
fi

echo "Phase 4 commercial foundation checks passed"
