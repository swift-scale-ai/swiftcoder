#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export SWIFTCODER_CHANNEL="${SWIFTCODER_CHANNEL:-dev}"
export SWIFTCODER_AUTHORIZATION_URL="${SWIFTCODER_AUTHORIZATION_URL:-https://dev.swift-scale.com/swiftcoder/authorize/}"
export SWIFTCODER_AUTH_BASE_URL="${SWIFTCODER_AUTH_BASE_URL:-https://admin-dev.swift-scale.com/v1/auth/desktop}"
export SWIFTCODER_ACCOUNT_BASE_URL="${SWIFTCODER_ACCOUNT_BASE_URL:-https://admin-dev.swift-scale.com/v1}"
export SWIFTCODER_GATEWAY_BASE_URL="${SWIFTCODER_GATEWAY_BASE_URL:-https://api-dev.swift-scale.com/v1}"

exec "$ROOT_DIR/tools/run-dev.sh"
