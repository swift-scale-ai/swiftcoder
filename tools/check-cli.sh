#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bun run --cwd "$ROOT_DIR/packages/opencode" typecheck
"$ROOT_DIR/tools/build-cli.sh"

binary="$ROOT_DIR/.artifacts/cli/swiftcoder"
[[ -x "$binary" ]] || binary="$ROOT_DIR/.artifacts/cli/swiftcoder.exe"

"$binary" --version
"$binary" --help >/dev/null 2>&1
"$binary" run --help >/dev/null 2>&1
"$binary" login --help 2>&1 | grep -q "log in to SwiftScale"
"$binary" models --help >/dev/null 2>&1
"$binary" session --help >/dev/null 2>&1

echo "SwiftCoder CLI checks passed"
