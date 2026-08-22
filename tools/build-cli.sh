#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_DIR="$ROOT_DIR/packages/opencode"
OUTPUT_DIR="$ROOT_DIR/.artifacts/cli"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

bun run --cwd "$PACKAGE_DIR" build -- --single --skip-embed-web-ui

case "$(uname -s)" in
  Darwin) platform="darwin" ;;
  Linux) platform="linux" ;;
  MINGW*|MSYS*|CYGWIN*) platform="windows" ;;
  *) echo "Unsupported platform: $(uname -s)" >&2; exit 1 ;;
esac

case "$(uname -m)" in
  arm64|aarch64) arch="arm64" ;;
  x86_64|amd64) arch="x64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

binary="$PACKAGE_DIR/dist/swiftcoder-$platform-$arch/bin/swiftcoder"
[[ "$platform" != "windows" ]] || binary="$binary.exe"
[[ -f "$binary" ]] || { echo "CLI binary was not generated: $binary" >&2; exit 1; }

cp "$binary" "$OUTPUT_DIR/$(basename "$binary")"
chmod +x "$OUTPUT_DIR/$(basename "$binary")"

"$OUTPUT_DIR/$(basename "$binary")" --version
"$OUTPUT_DIR/$(basename "$binary")" --help >/dev/null 2>&1
echo "Built SwiftCoder CLI: $OUTPUT_DIR/$(basename "$binary")"
