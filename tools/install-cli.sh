#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="${SWIFTCODER_CLI_BINARY:-$ROOT_DIR/.artifacts/cli/swiftcoder}"
INSTALL_DIR="${SWIFTCODER_INSTALL_DIR:-$HOME/.local/bin}"

if [[ ! -x "$SOURCE" ]]; then
  "$ROOT_DIR/tools/build-cli.sh"
fi

mkdir -p "$INSTALL_DIR"
install -m 755 "$SOURCE" "$INSTALL_DIR/swiftcoder"

echo "Installed SwiftCoder CLI to $INSTALL_DIR/swiftcoder"
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    echo "Add this directory to PATH:"
    echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
    ;;
esac
