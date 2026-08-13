#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
node "$ROOT/tools/check-open-source-readiness.mjs"
"$ROOT/tools/check-dependency-security.sh"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "SwiftCoder macOS releases must be built on macOS" >&2
  exit 1
fi

missing=()
for command in codesign security xcrun hdiutil ditto openssl; do
  command -v "$command" >/dev/null 2>&1 || missing+=("$command")
done
if (( ${#missing[@]} > 0 )); then
  echo "Missing release tools: ${missing[*]}" >&2
  exit 1
fi

if [[ -z "${SWIFTCODER_VERSION:-}" ]]; then
  echo "SWIFTCODER_VERSION is required (for example 0.1.0-alpha.1)" >&2
  exit 1
fi

if [[ -n "${CSC_LINK:-}" ]]; then
  if [[ ! -f "$CSC_LINK" ]]; then
    echo "Signing certificate is not a file: $CSC_LINK" >&2
    exit 1
  fi

  certificate_subject="$({
    openssl pkcs12 -in "$CSC_LINK" -passin "pass:${CSC_KEY_PASSWORD:-}" -clcerts -nokeys 2>/dev/null |
      openssl x509 -noout -subject 2>/dev/null
  } || true)"
  if [[ -z "$certificate_subject" ]]; then
    certificate_subject="$({
      openssl pkcs12 -legacy -in "$CSC_LINK" -passin "pass:${CSC_KEY_PASSWORD:-}" -clcerts -nokeys 2>/dev/null |
        openssl x509 -noout -subject 2>/dev/null
    } || true)"
  fi
  if [[ -z "$certificate_subject" ]]; then
    echo "OpenSSL could not inspect the signing certificate; macOS will validate it during import." >&2
  elif ! printf '%s\n' "$certificate_subject" | grep -Eq 'CN[[:space:]]*=[[:space:]]*Developer ID Application:'; then
    echo "The signing certificate is not a Developer ID Application certificate." >&2
    echo "Certificate subject: $certificate_subject" >&2
    exit 1
  fi
else
  identities="$(security find-identity -v -p codesigning 2>/dev/null || true)"
  if ! printf '%s\n' "$identities" | grep -Eq 'Developer ID Application'; then
    echo "No Developer ID Application identity found; configure CSC_LINK/CSC_KEY_PASSWORD or install the certificate" >&2
    exit 1
  fi
  if [[ -n "${CSC_NAME:-}" ]] && ! printf '%s\n' "$identities" | grep -Fq -- "$CSC_NAME"; then
    echo "CSC_NAME does not match an installed Developer ID Application identity: $CSC_NAME" >&2
    exit 1
  fi
fi

api_key_ready=false
apple_id_ready=false
if [[ -n "${APPLE_API_KEY:-}" && -n "${APPLE_API_KEY_ID:-}" && -n "${APPLE_API_ISSUER:-}" ]]; then
  api_key_ready=true
fi
if [[ -n "${APPLE_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" && -n "${APPLE_TEAM_ID:-}" ]]; then
  apple_id_ready=true
fi
if [[ "$api_key_ready" != true && "$apple_id_ready" != true ]]; then
  echo "Configure notarytool credentials with the APPLE_API_KEY trio or APPLE_ID trio" >&2
  exit 1
fi

echo "SwiftCoder macOS release credentials and tools are ready"
