# SwiftCoder releases

The current release line is **0.3.x**, starting with **v0.3.0**.
Use patch releases (`v0.3.1`, `v0.3.2`, and so on) for subsequent updates unless a new release line is explicitly requested.

1. Update shared and product packages in the same monorepo change.
2. Run `bun install --frozen-lockfile`, `bun run typecheck`, and `bun run check:boundaries`; update `bun.lock` when dependencies change.
3. Verify the release changes, then push the monorepo commit and an annotated `v0.3.x` tag. The migration itself does not push or create a new release tag.
4. The tag starts the macOS signing/notarization and cross-platform CLI release workflows. Verify both workflows and the GitHub Release assets before announcing completion.

Release builds take their version from the Git tag via `SWIFTCODER_VERSION`.
Local `tools/package-mac-dev.sh` builds use the nearest release tag plus `-dev`.
Automatic patch bumps use SwiftCoder's reachable stable tags and desktop package version as the baseline; they do not use the upstream OpenCode version.
