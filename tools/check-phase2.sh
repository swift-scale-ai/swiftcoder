#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BUN="$ROOT/.tools/bun"

"$ROOT/tools/check-phase1.sh"

(cd "$ROOT/packages/core" && "$BUN" test test/filesystem/filesystem.test.ts)

(cd "$ROOT/packages/opencode" && "$BUN" test \
  test/agent/agent.test.ts \
  test/tool/external-directory.test.ts \
  test/tool/read.test.ts \
  test/tool/glob.test.ts \
  test/tool/grep.test.ts \
  test/tool/write.test.ts \
  test/tool/edit.test.ts \
  test/tool/apply_patch.test.ts \
  test/tool/shell.test.ts \
  test/project/vcs.test.ts \
  test/session/revert-compact.test.ts)

# Keep listener-backed suites isolated. They bind temporary loopback ports and
# require the normal macOS development environment rather than a network sandbox.
(cd "$ROOT/packages/opencode" && "$BUN" test test/server/session-actions.test.ts)
(cd "$ROOT/packages/opencode" && "$BUN" test test/server/httpapi-v2-pty.test.ts)
(cd "$ROOT/packages/opencode" && "$BUN" test test/cli/serve/session-restart.test.ts)

(cd "$ROOT/packages/app" && "$BUN" test --conditions=solid --preload ./happydom.ts \
  src/pages/home-session-open.test.ts \
  src/pages/home-session-archive.test.ts \
  src/pages/new-session/new-session-workspace-controller.test.ts \
  src/pages/session/terminal-panel.test.ts \
  src/pages/session/v2/review-diff-kinds.test.ts \
  src/utils/diffs.test.ts \
  src/context/permission-auto-respond.test.ts \
  src/context/terminal.test.ts)

(cd "$ROOT/tools" && "$BUN" test phase2-stack-matrix.test.ts)

echo "Phase 2 foundation checks passed"
