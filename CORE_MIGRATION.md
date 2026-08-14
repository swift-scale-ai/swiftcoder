# SwiftCore migration

This repository contains the SwiftCoder product. Product-neutral packages now
live in the adjacent `../swiftcore` repository and are linked through explicit
`file:` dependencies during local development.

The expected checkout layout is:

```text
swiftscale-agent/
├── swiftcore/
├── swiftcoder/
└── swiftworks/
```

Once `@swiftscale/*` packages are published, release builds should replace the
local `file:` references with exact registry versions.

Until then, CI checks out both repositories into the same parent directory and
uses `.swiftcore-ref` as the compatibility lock. The file must contain the full
40-character commit SHA of the SwiftCore revision required by SwiftCoder. When
SwiftCoder adopts a newer Core revision, update `.swiftcore-ref` and `bun.lock`
in the same change.

The pinned SwiftCore commit must be pushed before the corresponding SwiftCoder
change. Public repositories need no additional checkout credential. If
SwiftCore becomes private, configure a read-only cross-repository token for its
checkout step.

SwiftCoder owns coding prompts, Git, repository context, LSP, terminal, patch
tools, CLI/TUI, the Coder desktop interface, branding and packaging.
