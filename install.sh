#!/bin/sh
set -eu

REPOSITORY="swift-scale-ai/swiftcoder"
VERSION="${SWIFTCODER_VERSION:-latest}"
INSTALL_DIR="${SWIFTCODER_INSTALL_DIR:-$HOME/.local/bin}"

usage() {
  cat <<'EOF'
Install the SwiftCoder CLI from GitHub Releases.

Usage:
  install.sh [--version VERSION] [--install-dir DIRECTORY]

Environment:
  SWIFTCODER_VERSION       Release version or tag (default: latest)
  SWIFTCODER_INSTALL_DIR   Installation directory (default: ~/.local/bin)
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version) [ "$#" -ge 2 ] || { echo "--version requires a value" >&2; exit 1; }; VERSION="$2"; shift 2 ;;
    --install-dir) [ "$#" -ge 2 ] || { echo "--install-dir requires a value" >&2; exit 1; }; INSTALL_DIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }

case "$(uname -s)" in
  Darwin) PLATFORM="darwin" ;;
  Linux) PLATFORM="linux" ;;
  *) echo "Use install.ps1 on Windows." >&2; exit 1 ;;
esac
case "$(uname -m)" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64|amd64) ARCH="x64" ;;
  *) echo "Unsupported CPU architecture: $(uname -m)" >&2; exit 1 ;;
esac

if [ "$VERSION" = "latest" ]; then
  RELEASE_URL="$(curl -fsSL -o /dev/null -w '%{url_effective}' "https://github.com/$REPOSITORY/releases/latest")"
  TAG="${RELEASE_URL##*/}"
else
  case "$VERSION" in v*) TAG="$VERSION" ;; *) TAG="v$VERSION" ;; esac
fi

printf '%s\n' "$TAG" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$' || {
  echo "Invalid SwiftCoder release tag: $TAG" >&2
  exit 1
}

BASE="swiftcoder-cli-$PLATFORM-$ARCH"
if [ "$ARCH" = "x64" ]; then
  HAS_AVX2=0
  if [ "$PLATFORM" = "linux" ] && grep -qiE '(^|[[:space:]])avx2([[:space:]]|$)' /proc/cpuinfo 2>/dev/null; then
    HAS_AVX2=1
  elif [ "$PLATFORM" = "darwin" ] && sysctl -n machdep.cpu.leaf7_features 2>/dev/null | grep -qi 'AVX2'; then
    HAS_AVX2=1
  fi
  [ "$HAS_AVX2" -eq 1 ] || BASE="$BASE-baseline"
fi

if [ "$PLATFORM" = "linux" ]; then
  IS_MUSL=0
  [ -f /etc/alpine-release ] && IS_MUSL=1
  if [ "$IS_MUSL" -eq 0 ] && command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl; then IS_MUSL=1; fi
  [ "$IS_MUSL" -eq 0 ] || BASE="$BASE-musl"
  ARCHIVE="$BASE.tar.gz"
else
  ARCHIVE="$BASE.zip"
fi

DOWNLOAD_BASE="https://github.com/$REPOSITORY/releases/download/$TAG"
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t swiftcoder)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

echo "Downloading SwiftCoder CLI $TAG ($PLATFORM-$ARCH)..."
curl -fL --retry 3 --retry-delay 1 "$DOWNLOAD_BASE/$ARCHIVE" -o "$TMP_DIR/$ARCHIVE"
curl -fL --retry 3 --retry-delay 1 "$DOWNLOAD_BASE/swiftcoder-cli-checksums.txt" -o "$TMP_DIR/checksums.txt"

EXPECTED="$(awk -v name="$ARCHIVE" '$2 == name { print $1; exit }' "$TMP_DIR/checksums.txt")"
[ -n "$EXPECTED" ] || { echo "No checksum published for $ARCHIVE" >&2; exit 1; }
if command -v sha256sum >/dev/null 2>&1; then ACTUAL="$(sha256sum "$TMP_DIR/$ARCHIVE" | awk '{print $1}')";
elif command -v shasum >/dev/null 2>&1; then ACTUAL="$(shasum -a 256 "$TMP_DIR/$ARCHIVE" | awk '{print $1}')";
else echo "sha256sum or shasum is required" >&2; exit 1; fi
[ "$ACTUAL" = "$EXPECTED" ] || { echo "Checksum verification failed for $ARCHIVE" >&2; exit 1; }

mkdir -p "$TMP_DIR/extracted"
if [ "$PLATFORM" = "darwin" ]; then unzip -q "$TMP_DIR/$ARCHIVE" -d "$TMP_DIR/extracted";
else tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR/extracted"; fi
BINARY="$(find "$TMP_DIR/extracted" -type f -name swiftcoder -print | head -1)"
[ -n "$BINARY" ] || { echo "The release archive does not contain swiftcoder" >&2; exit 1; }

mkdir -p "$INSTALL_DIR"
install -m 755 "$BINARY" "$INSTALL_DIR/swiftcoder"
echo "Installed SwiftCoder CLI $TAG to $INSTALL_DIR/swiftcoder"
echo "Next: swiftcoder login"
