#!/usr/bin/env bash
set -euo pipefail

# opencode Korean IME Fix Installer
# https://github.com/anomalyco/opencode/issues/14371
#
# Patches opencode to prevent Korean (and other CJK) IME last character
# truncation when pressing Enter in Kitty and other terminals.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/claudianus/opencode/fix-zhipuai-coding-plan-thinking/patches/install-korean-ime-fix.sh | bash
#   # or from a cloned repo:
#   ./patches/install-korean-ime-fix.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
ORANGE='\033[38;5;214m'
MUTED='\033[0;2m'
NC='\033[0m'

SWIFTCODER_DIR="${SWIFTCODER_DIR:-$HOME/.swiftcoder}"
SWIFTCODER_SRC="${SWIFTCODER_SRC:-$HOME/.swiftcoder-src}"
FORK_REPO="${FORK_REPO:-https://github.com/claudianus/opencode.git}"
FORK_BRANCH="${FORK_BRANCH:-fix-zhipuai-coding-plan-thinking}"

info()  { echo -e "${MUTED}$*${NC}"; }
warn()  { echo -e "${ORANGE}$*${NC}"; }
err()   { echo -e "${RED}$*${NC}" >&2; }
ok()    { echo -e "${GREEN}$*${NC}"; }

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Error: $1 is required but not installed."
    exit 1
  fi
}

need git
need bun

# ── 1. Clone or update fork ────────────────────────────────────────────
if [ -d "$SWIFTCODER_SRC/.git" ]; then
  info "Updating existing source at $SWIFTCODER_SRC ..."
  git -C "$SWIFTCODER_SRC" fetch origin "$FORK_BRANCH"
  git -C "$SWIFTCODER_SRC" checkout "$FORK_BRANCH"
  git -C "$SWIFTCODER_SRC" reset --hard "origin/$FORK_BRANCH"
else
  info "Cloning fork (shallow) to $SWIFTCODER_SRC ..."
  git clone --depth 1 --branch "$FORK_BRANCH" "$FORK_REPO" "$SWIFTCODER_SRC"
fi

# ── 2. Verify the IME fix is present in source ────────────────────────
PROMPT_FILE="$SWIFTCODER_SRC/packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx"
if [ ! -f "$PROMPT_FILE" ]; then
  err "Prompt file not found: $PROMPT_FILE"
  exit 1
fi

if grep -q "setTimeout(() => setTimeout" "$PROMPT_FILE"; then
  ok "IME fix already present in source."
else
  warn "IME fix not found. Applying patch ..."
  # Apply the fix: replace onSubmit={submit} with double-deferred version
  sed -i 's|onSubmit={submit}|onSubmit={() => {\n                // IME: double-defer so the last composed character (e.g. Korean\n                // hangul) is flushed to plainText before we read it for submission.\n                setTimeout(() => setTimeout(() => submit(), 0), 0)\n              }}|' "$PROMPT_FILE"
  if grep -q "setTimeout(() => setTimeout" "$PROMPT_FILE"; then
    ok "Patch applied."
  else
    err "Failed to apply patch. The source may have changed."
    exit 1
  fi
fi

# ── 3. Install dependencies ────────────────────────────────────────────
info "Installing dependencies (this may take a minute) ..."
cd "$SWIFTCODER_SRC"
bun install --frozen-lockfile 2>/dev/null || bun install

# ── 4. Build (current platform only) ──────────────────────────────────
info "Building opencode for current platform ..."
cd "$SWIFTCODER_SRC/packages/opencode"
bun run build --single

# ── 5. Install binary ──────────────────────────────────────────────────
mkdir -p "$SWIFTCODER_DIR/bin"

PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
[ "$ARCH" = "aarch64" ] && ARCH="arm64"
[ "$ARCH" = "x86_64" ] && ARCH="x64"
[ "$PLATFORM" = "darwin" ] && true
[ "$PLATFORM" = "linux" ] && true

BUILT_BINARY="$SWIFTCODER_SRC/packages/opencode/dist/swiftcoder-${PLATFORM}-${ARCH}/bin/swiftcoder"

if [ ! -f "$BUILT_BINARY" ]; then
  BUILT_BINARY=$(find "$SWIFTCODER_SRC/packages/opencode/dist" -name "swiftcoder" -type f -executable 2>/dev/null | head -1)
fi

if [ -f "$BUILT_BINARY" ]; then
  if [ -f "$SWIFTCODER_DIR/bin/swiftcoder" ]; then
    cp "$SWIFTCODER_DIR/bin/swiftcoder" "$SWIFTCODER_DIR/bin/swiftcoder.bak.$(date +%Y%m%d%H%M%S)"
  fi
  cp "$BUILT_BINARY" "$SWIFTCODER_DIR/bin/swiftcoder"
  chmod +x "$SWIFTCODER_DIR/bin/swiftcoder"
  ok "Installed to $SWIFTCODER_DIR/bin/swiftcoder"
else
  err "Build failed - binary not found in dist/"
  info "Try running manually:"
  echo "  cd $SWIFTCODER_SRC/packages/opencode && bun run build --single"
  exit 1
fi

echo ""
ok "Done! Korean IME fix is now active."
echo ""
info "To uninstall and revert to the official release:"
echo "  curl -fsSL https://swift-scale.com/install | bash"
echo ""
info "To update (re-pull and rebuild):"
echo "  $0"
