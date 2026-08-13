#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CONFIG="${SWIFTCODER_RELEASE_ENV:-$HOME/.config/swiftcoder/release.env}"
DIST="$ROOT/packages/desktop/dist"
CHANNEL=""
STAGE_WEB=false
LOCAL_TEST=false
SIGNING_TMP=""
LOCK_DIR="${TMPDIR:-/tmp}/swiftcoder-package-mac-release.lock"

cleanup() {
  if [[ -n "$SIGNING_TMP" && -d "$SIGNING_TMP" ]]; then
    rm -rf "$SIGNING_TMP"
  fi
  if [[ -d "$LOCK_DIR" ]] && [[ "$(cat "$LOCK_DIR/pid" 2>/dev/null || true)" == "$$" ]]; then
    rm -rf "$LOCK_DIR"
  fi
}
trap cleanup EXIT

usage() {
  echo "Usage: $0 [prod|beta] [--stage-web] [--local-test]" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    prod|beta)
      if [[ -n "$CHANNEL" ]]; then
        usage
        exit 1
      fi
      CHANNEL="$1"
      ;;
    --stage-web)
      STAGE_WEB=true
      ;;
    --local-test)
      LOCAL_TEST=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
  shift
done

if [[ ! -f "$CONFIG" ]]; then
  echo "Release configuration not found: $CONFIG" >&2
  exit 1
fi

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  ACTIVE_PID="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
  if [[ -n "$ACTIVE_PID" ]] && kill -0 "$ACTIVE_PID" 2>/dev/null; then
    echo "Another SwiftCoder macOS release is already running (PID $ACTIVE_PID)." >&2
    exit 1
  fi
  rm -rf "$LOCK_DIR"
  mkdir "$LOCK_DIR"
fi
printf '%s\n' "$$" >"$LOCK_DIR/pid"

set -a
# shellcheck source=/dev/null
source "$CONFIG"
set +a

# electron-builder distinguishes an unset CSC_LINK from an exported empty
# value. An empty exported value resolves to the project directory and is then
# rejected as "not a file", so normalize empty signing variables here.
if [[ -z "${CSC_LINK:-}" ]]; then
  unset CSC_LINK CSC_KEY_PASSWORD
fi
if [[ -z "${CSC_NAME:-}" ]]; then
  unset CSC_NAME
elif [[ "$CSC_NAME" == "Developer ID Application: "* ]]; then
  export CSC_NAME="${CSC_NAME#Developer ID Application: }"
fi

CHANNEL="${CHANNEL:-${SWIFTCODER_CHANNEL:-prod}}"
if [[ "$CHANNEL" != "prod" && "$CHANNEL" != "beta" ]]; then
  echo "Release channel must be prod or beta, got: $CHANNEL" >&2
  exit 1
fi

export SWIFTCODER_CHANNEL="$CHANNEL"

if [[ -x "$ROOT/.tools/bun" ]]; then
  export PATH="$ROOT/.tools:$PATH"
fi

cd "$ROOT"

if [[ "$LOCAL_TEST" == true ]]; then
  if [[ "$CHANNEL" != "prod" ]]; then
    echo "--local-test currently supports only the prod channel" >&2
    exit 1
  fi
  if [[ "$STAGE_WEB" == true ]]; then
    echo "--local-test artifacts cannot be staged to a public release channel" >&2
    exit 1
  fi
  if [[ -z "${SWIFTCODER_VERSION:-}" ]]; then
    echo "SWIFTCODER_VERSION is required for --local-test" >&2
    exit 1
  fi
  if [[ "$SWIFTCODER_VERSION" != *-* ]]; then
    export SWIFTCODER_VERSION="$SWIFTCODER_VERSION-test.1"
  fi
  unset CSC_LINK CSC_KEY_PASSWORD CSC_NAME
  export SWIFTCODER_SKIP_NOTARIZE="1"
  export CSC_IDENTITY_AUTO_DISCOVERY="false"
  "$ROOT/tools/package-mac-alpha.sh"
  exit 0
fi

unset SWIFTCODER_SKIP_NOTARIZE
"$ROOT/tools/preflight-mac-release.sh"

# electron-builder cannot reliably configure its temporary keychain when the
# source PKCS#12 bundle has an empty password. Repack it for this process only;
# the original certificate and external release configuration remain unchanged.
if [[ -n "${CSC_LINK:-}" && -z "${CSC_KEY_PASSWORD:-}" ]]; then
  SIGNING_TMP="$(mktemp -d "${TMPDIR:-/tmp}/swiftcoder-signing.XXXXXX")"
  SIGNING_PEM="$SIGNING_TMP/signing.pem"
  SIGNING_P12="$SIGNING_TMP/signing.p12"
  SIGNING_PASSWORD="$(openssl rand -hex 24)"

  if ! openssl pkcs12 -legacy -in "$CSC_LINK" -passin pass: -nodes -out "$SIGNING_PEM" >/dev/null 2>&1; then
    echo "Unable to read the passwordless signing certificate: $CSC_LINK" >&2
    exit 1
  fi
  if ! openssl pkcs12 -export -legacy -in "$SIGNING_PEM" -out "$SIGNING_P12" \
    -passout "pass:$SIGNING_PASSWORD" >/dev/null 2>&1; then
    echo "Unable to create the temporary signing certificate" >&2
    exit 1
  fi

  chmod 600 "$SIGNING_PEM" "$SIGNING_P12"
  export CSC_LINK="$SIGNING_P12"
  export CSC_KEY_PASSWORD="$SIGNING_PASSWORD"
  echo "Prepared a temporary password-protected certificate for electron-builder."
fi

if [[ -d "$DIST" ]]; then
  find "$DIST" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
else
  mkdir -p "$DIST"
fi

bun run build
bun run package:mac

APP_NAME="SwiftCoder.app"
if [[ "$CHANNEL" == "beta" ]]; then
  APP_NAME="SwiftCoder Beta.app"
fi
APP="$(find "$DIST" -maxdepth 3 -type d -name "$APP_NAME" -print -quit)"
METADATA="$DIST/latest-mac.yml"
if [[ -z "$APP" || ! -f "$METADATA" ]]; then
  echo "Expected signed app or update manifest was not produced in $DIST" >&2
  exit 1
fi

ZIP_NAME="$(sed -n 's/^path:[[:space:]]*//p' "$METADATA" | head -1 | tr -d "'\"")"
DMG="$DIST/${ZIP_NAME%.zip}.dmg"
if [[ -z "$ZIP_NAME" || ! -f "$DMG" ]]; then
  echo "Expected release DMG was not produced in $DIST" >&2
  exit 1
fi

# electron-builder notarizes and staples the app. Submit the outer DMG as well
# so Gatekeeper can validate the downloaded container before it is mounted.
if ! xcrun stapler validate "$DMG" >/dev/null 2>&1; then
  NOTARY_RESULT="$(mktemp "${TMPDIR:-/tmp}/swiftcoder-notary.XXXXXX")"
  NOTARY_EXIT=0
  if [[ -n "${APPLE_API_KEY:-}" && -n "${APPLE_API_KEY_ID:-}" && -n "${APPLE_API_ISSUER:-}" ]]; then
    xcrun notarytool submit "$DMG" \
      --key "$APPLE_API_KEY" \
      --key-id "$APPLE_API_KEY_ID" \
      --issuer "$APPLE_API_ISSUER" \
      --wait \
      --output-format json >"$NOTARY_RESULT" || NOTARY_EXIT=$?
  else
    xcrun notarytool submit "$DMG" \
      --apple-id "$APPLE_ID" \
      --password "$APPLE_APP_SPECIFIC_PASSWORD" \
      --team-id "$APPLE_TEAM_ID" \
      --wait \
      --output-format json >"$NOTARY_RESULT" || NOTARY_EXIT=$?
  fi

  cat "$NOTARY_RESULT"
  NOTARY_ID="$(node -e 'try { console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).id || "") } catch {}' "$NOTARY_RESULT")"
  NOTARY_STATUS="$(node -e 'try { console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).status || "") } catch {}' "$NOTARY_RESULT")"
  rm -f "$NOTARY_RESULT"

  if [[ "$NOTARY_EXIT" -ne 0 || "$NOTARY_STATUS" != "Accepted" ]]; then
    echo "Apple notarization failed with status: ${NOTARY_STATUS:-unknown}" >&2
    if [[ -n "$NOTARY_ID" ]]; then
      if [[ -n "${APPLE_API_KEY:-}" && -n "${APPLE_API_KEY_ID:-}" && -n "${APPLE_API_ISSUER:-}" ]]; then
        xcrun notarytool log "$NOTARY_ID" \
          --key "$APPLE_API_KEY" \
          --key-id "$APPLE_API_KEY_ID" \
          --issuer "$APPLE_API_ISSUER" || true
      else
        xcrun notarytool log "$NOTARY_ID" \
          --apple-id "$APPLE_ID" \
          --password "$APPLE_APP_SPECIFIC_PASSWORD" \
          --team-id "$APPLE_TEAM_ID" || true
      fi
    fi
    exit 1
  fi
  xcrun stapler staple "$DMG"
fi

"$ROOT/tools/check-mac-artifacts.sh" "$DIST"

if [[ "$STAGE_WEB" == true ]]; then
  "$ROOT/tools/stage-mac-release.sh" "$CHANNEL" "$DIST"
fi

echo "SwiftCoder $CHANNEL $SWIFTCODER_VERSION release artifacts: $DIST"
if [[ "$STAGE_WEB" != true ]]; then
  echo "Run '$ROOT/tools/stage-mac-release.sh $CHANNEL' to stage this release for swiftcoder.io."
fi
