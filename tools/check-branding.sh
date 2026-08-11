#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUNTIME_PATHS=(
  packages/app/src
  packages/app/public
  packages/core/src
  packages/desktop/src
  packages/desktop/scripts
  packages/desktop/resources
  packages/opencode/src
  packages/opencode/script
  packages/opencode/resources
  packages/server/src
  packages/sdk/js/src
  packages/client/src
  packages/tui/src
)

FORBIDDEN='\bOpenCode\b|opencode[.]ai|models[.]opencode[.]ai|opncd[.]ai|swiftcoder[.]ai|OPENCODE_|x-opencode|oc://|opencode-go|opencode[.]json|[.]opencode|opencode-cli|opencode[.]local|opencode[.]db|opencode-root|opencode-instance|/bin/opencode|anomalyco/opencode|discord[.]com/invite/opencode'

if rg -n \
  --glob '!**/node_modules/**' \
  --glob '!**/dist/**' \
  --glob '!**/out/**' \
  --glob '!packages/app/src/utils/client-brand-compat.ts' \
  --glob '!packages/opencode/src/mcp/index.ts' \
  "$FORBIDDEN" "${RUNTIME_PATHS[@]}"; then
  echo "Legacy OpenCode product branding found in a runtime surface." >&2
  exit 1
fi

echo "SwiftCoder runtime branding check passed."
