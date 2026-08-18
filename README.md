# SwiftCore

SwiftCore is the shared agent runtime and application platform behind
SwiftCoder and SwiftWorks.

It owns product-neutral schemas, protocols, model integration, sessions,
permissions, tools, skills, plugins, storage, server APIs, and reusable UI.
Product workflows and product branding do not belong in this repository.

## Dependency rule

SwiftCoder and SwiftWorks may depend on SwiftCore. SwiftCore must never import
from either product repository.

## Packages

- `@swiftscale/core` — runtime services, sessions, permissions, storage and tools
- `@swiftscale/schema` — shared data contracts
- `@swiftscale/protocol` — server protocol
- `@swiftscale/server` — product-neutral server handlers
- `@swiftscale/client` and `@swiftscale/sdk` — clients and extension API
- `@swiftscale/llm` — model integration
- `@swiftscale/plugin` — plugin contracts
- `@swiftscale/desktop-kit` — product identity, OAuth, deep links, window state,
  updates and restartable sidecar lifecycle
- `@swiftscale/ui` and `@swiftscale/session-ui` — reusable interface layers

## Migration status

This is the first physical extraction from SwiftCoder. Some coding-oriented
implementations still exist in `@swiftscale/core`; they are compatibility code
and should move into SwiftCoder before SwiftWorks consumes those entry points.

`@swiftscale/session-ui` temporarily retains the upstream promise client as a
vendored compatibility dependency. It should be replaced by generated promise
exports in `@swiftscale/client` during the next migration phase.

## License and attribution

SwiftCore is released under the MIT License in `LICENSE`. Upstream attribution,
font licensing, and complete third-party license texts are recorded in
`THIRD_PARTY_NOTICES.md` and `legal/`. Product names and artwork are governed by
`TRADEMARKS.md`.
