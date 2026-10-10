# SwiftCoder monorepo migration

SwiftCoder and SwiftCore now live in one repository. The original repositories
remain unchanged; this checkout was created in `swiftcoder-v2`.

```text
swiftcoder-v2/
├── packages/
│   ├── app, desktop, opencode, tui, codemode   Product packages
│   ├── core, llm, schema, protocol, plugin    Agent foundation
│   ├── client, server, sdk/js                 API contracts
│   ├── ui, session-ui, desktop-kit           Shared experience
│   └── script, core-script                  Build helpers
├── tools/                                   Product tooling
├── scripts/                                 Shared boundary checks
└── bun.lock                                 One dependency lock
```

All local package dependencies use `workspace:*`. No adjacent SwiftCore
checkout, parent dependency-tree symlink, or `.swiftcore-ref` is required.
The two `script` directories have different package names: the product keeps
`@swiftscale/coder-script` in `packages/script`, while `@swiftscale/script`
is located in `packages/core-script`.

The migration records both source commits in `UPSTREAM_BASELINE.json`, and the
local merge commit retains both Git histories. Existing release tags describe
the historical split-repository layout, not this migration.

SwiftCoder still owns coding prompts, Git, repository context, LSP, terminal,
patch tools, CLI/TUI, product branding and packaging. Shared packages must not
depend on product packages. `bun run check:boundaries` enforces the dependency
direction and verifies local workspace references.

Run `./tools/bootstrap.sh`, `bun run typecheck`, and `bun run check:boundaries`
from this repository. Build a macOS development app with
`./tools/package-mac-dev.sh`. Core and product changes are committed, tested and
released together; CI checks out only this repository.
