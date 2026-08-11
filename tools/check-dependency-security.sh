#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

if command -v bun >/dev/null 2>&1; then
  BUN_BIN="$(command -v bun)"
elif [[ -x "$ROOT/.tools/bun" ]]; then
  BUN_BIN="$ROOT/.tools/bun"
else
  echo "Bun is required to run the dependency security audit" >&2
  exit 1
fi

cd "$ROOT"
"$BUN_BIN" audit
