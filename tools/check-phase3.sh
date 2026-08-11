#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BUN="$ROOT/.tools/bun"

"$ROOT/tools/check-phase2.sh"

(cd "$ROOT/packages/desktop" && "$BUN" test \
  electron-builder.config.test.ts \
  src/main/ipc-contract.test.ts \
  src/main/local-data.test.ts \
  src/main/renderer-security.test.ts \
  src/main/local-server-security.test.ts)
(cd "$ROOT/packages/opencode" && "$BUN" test test/config/product-policy.test.ts)
(cd "$ROOT/packages/opencode" && "$BUN" test test/session/messages-pagination.test.ts)
(cd "$ROOT/packages/app" && "$BUN" test --conditions=solid --preload ./happydom.ts \
  src/pages/session/usage-exceeded-dialogs.test.ts \
  src/pages/session/timeline/rows-current.test.ts \
  src/pages/session/timeline/virtual-items.test.ts)
"$BUN" "$ROOT/tools/check-desktop-bundle.mjs"
bash -n "$ROOT/tools/preflight-mac-release.sh"
bash -n "$ROOT/tools/check-mac-artifacts.sh"
bash -n "$ROOT/tools/package-mac-alpha.sh"
bash -n "$ROOT/tools/package-mac-release.sh"
if [[ "$(uname -s)" == "Darwin" ]]; then
  node "$ROOT/tools/check-desktop-runtime.mjs"
fi

if rg -n 'package:(win|linux)' "$ROOT/packages/desktop/package.json"; then
  echo "Non-macOS package command remains in the V1 desktop manifest" >&2
  exit 1
fi

if rg -n 'disable-executable-page-protection|allow-dyld-environment-variables' \
  "$ROOT/packages/desktop/resources/entitlements.plist"; then
  echo "Unsafe Hardened Runtime entitlement remains enabled" >&2
  exit 1
fi

if rg -n 'ipcMain\.(handle|on)' "$ROOT/packages/desktop/src/main" \
  --glob '!ipc-security.ts'; then
  echo "Direct IPC registration bypasses the trusted renderer and argument contract" >&2
  exit 1
fi

if rg -n 'wsl-servers|WslServers|/wsl/|get-display-backend|set-display-backend|resolve-app-path|install-cli' \
  "$ROOT/packages/desktop/src/main/index.ts" \
  "$ROOT/packages/desktop/src/main/ipc.ts" \
  "$ROOT/packages/desktop/src/preload" \
  "$ROOT/packages/desktop/src/renderer/index.tsx"; then
  echo "Non-macOS capability remains connected to the SwiftCoder desktop entry points" >&2
  exit 1
fi

echo "Phase 3 alpha foundation checks passed"
