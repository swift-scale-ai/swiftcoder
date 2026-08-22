<p align="center">
  <img src="packages/app/public/swiftcoder-logo-128.png" width="96" alt="SwiftCoder logo">
</p>

<h1 align="center">SwiftCoder</h1>

<p align="center"><strong>A local-first AI coding agent for macOS and the terminal.</strong></p>

<p align="center">
  <a href="https://swiftscale.app/swiftcoder/">Download for macOS</a> ·
  <a href="docs/cli.md">CLI Guide</a> ·
  <a href="https://github.com/swift-scale-ai/swiftcoder/issues">Issues</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

<p align="center">
  <a href="https://github.com/swift-scale-ai/swiftcoder/actions/workflows/verify.yml"><img src="https://github.com/swift-scale-ai/swiftcoder/actions/workflows/verify.yml/badge.svg" alt="Verify"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-0b7285.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/macOS-13%2B-111827.svg" alt="macOS 13+">
  <img src="https://img.shields.io/badge/TypeScript-3178c6.svg" alt="TypeScript">
</p>
English | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

SwiftCoder is a lightweight AI coding agent for macOS, powered by
[SwiftScale](https://swift-scale.com). It turns a natural-language task into a
controlled local workflow: understand the repository, plan the work, inspect
and edit files, run commands, review changes, and verify the result.

SwiftCoder combines an Electron desktop shell, a focused SolidJS workbench,
and an embedded TypeScript Agent Server derived from OpenCode. The desktop
client is designed to be open, inspectable, and local-first, while SwiftScale
provides identity, account entitlements, model access, routing, and commercial
AI services.

## Positioning

SwiftCoder is the desktop entry point to SwiftScale for software developers.
It is intended for real work in an existing repository rather than isolated
prompt-and-response conversations.

It is:

- an AI coding agent that can carry a task from repository analysis through
  implementation and verification;
- a native-feeling macOS workbench for projects, coding sessions, standalone
  chats, diffs, tasks, and terminal activity;
- a zero-configuration path into the models and capacity available to a
  user's SwiftScale account;
- an open-source desktop client with explicit local execution and permission
  boundaries.

It is not intended to replace a full IDE, hide autonomous actions from the
user, or become a general-purpose chat client. Editors and IDEs remain the
primary environment for detailed code authoring; SwiftCoder focuses on
delegating and supervising complete engineering tasks.

## Product Principles

- **Project first.** Projects and their sessions are first-class. SwiftCoder
  starts from the repository and its actual state, not from an empty chat box.
- **Agentic, but controlled.** The agent can work through multiple steps, while
  sensitive file, shell, network, and system actions remain visible and
  subject to permission policy.
- **Local by default.** Repository access, tools, command execution, diffs, and
  session state are handled locally. Only the context required for AI
  inference is sent to SwiftScale.
- **Reviewable work.** Plans, tool calls, commands, file changes, errors, and
  validation results are presented as a traceable task timeline.
- **Account-aware model access.** The available product mode and model catalog
  come from the signed-in account's SwiftScale entitlements rather than a
  hard-coded client list.
- **Focused product surface.** SwiftCoder favors a compact coding workflow over
  exposing every provider, model parameter, or upstream feature.

## Key Capabilities

- Organize local projects and project-scoped coding sessions, with a separate
  area for standalone chats.
- Understand a repository using file search, content inspection, project
  instructions, Git state, and session context.
- Create and modify multiple files, present diffs, and support review or
  rollback of changes.
- Run terminal commands, stream output, stop long-running work, and summarize
  type checks, tests, builds, and other validation results.
- Show plans, progress, tool activity, generated outputs, and actionable error
  states in a focused desktop workbench.
- Sign in through SwiftScale OAuth with credentials stored in macOS Keychain.
- Adapt product mode and model choices to Coding Plan, API Services, or combined
  account access. Model availability is supplied by the SwiftScale control
  plane.
- Keep projects and chat history isolated by signed-in account on the local
  device.

## Vision

Our goal is to make capable coding agents practical for everyday software
development: easy to start, powerful enough to complete meaningful work, and
transparent enough to trust in a real repository.

SwiftCoder is also a product bridge between an open desktop agent and the
SwiftScale AI platform. Over time, the client should provide a consistent way
to access improving models, routing, capacity, and team capabilities without
forcing developers to rebuild their workflow around individual model vendors.
The long-term measure of success is not how much text the agent generates, but
how reliably it helps a developer move from intent to reviewed, verified code.

## How It Works

```text
Developer
   |
   v
SwiftCoder Desktop (projects, sessions, timeline, diff, terminal)
   |
   +--> Local Agent Server (context, tools, permissions, persistence)
   |         |
   |         +--> Local workspace / Git / shell
   |
   +--> SwiftScale (identity, entitlements, model routing, inference)
```

## Requirements

- macOS 13 or newer
- Bun 1.3.14
- Node.js 22.22.2 or newer
- Xcode Command Line Tools

## Development

```bash
./tools/bootstrap.sh
./tools/check-phase0.sh
./tools/run-dev.sh
./tools/package-mac-dev.sh
```

The tools also recognize a repository-local Bun binary at `.tools/bun` for
reproducible local builds.

Run against the deployed SwiftScale development environment:

```bash
./tools/run-dev-cloud.sh
```

Build the renderer and embedded Agent Server without starting Electron:

```bash
SWIFTCODER_CHANNEL=prod bun run build
```

Run the complete current implementation gate:

```bash
./tools/check-phase4.sh
```

### TypeScript 7 Experiment

The `experiment/typescript-7` branch validates SwiftCoder with the stable
TypeScript 7 compiler across the monorepo. It replaces the previous native
preview setup, standardizes workspace type checks on `tsc`, adds explicit Bun
ambient types, and updates compatible build and runtime dependencies. The
JavaScript Compiler API remains on TypeScript 6 temporarily for tools that
still depend on its runtime API.

See [TypeScript 7 Upgrade](docs/typescript-7-upgrade.md) for the migration
scope, dependency changes, validation results, and known limitations.

## Open-Source Release Checks

Generate and verify the dependency license inventory before publishing source
or desktop artifacts:

```bash
bun run licenses:generate
bun run check:open-source
bun run check:security
```

Generated binaries, dependencies, local state, credentials, logs, test output,
and signing material are excluded by `.gitignore`. Do not bypass these rules by
uploading the directory manually; publish from a reviewed Git index.

For a signed macOS release, `bun run release:preflight` runs both public-source
and dependency-security gates before checking Apple signing credentials.

Build, sign, notarize, and verify the production macOS application with the
credentials stored outside the repository in
`~/.config/swiftcoder/release.env`:

```bash
./tools/package-mac-release.sh
```

For a production-configured internal test build that uses ad-hoc signing and
skips Apple notarization, run:

```bash
./tools/package-mac-release.sh prod --local-test
```

Local test artifacts are never eligible for staging to a public update channel.

## Source Layout

- `packages/desktop`: Electron main process, preload, packaging, and renderer entry.
- `packages/app`: SolidJS workspace UI.
- `packages/opencode`: embedded TypeScript Agent Server retained from the upstream baseline.
- `packages/core`, `packages/schema`, `packages/protocol`: shared Agent domain and API contracts.
- `packages/ui`, `packages/session-ui`: UI and Agent timeline components.
- `tools`: SwiftCoder development, verification, packaging, and release automation.
- `script`: retained upstream repository-maintenance utilities pending consolidation.
- `UPSTREAM_BASELINE.json`: exact upstream provenance and retained package list.

## License And Attribution

SwiftCoder source is released under the MIT License in `LICENSE`. Substantial
portions are derived from OpenCode and retain the upstream copyright and MIT
notice in `THIRD_PARTY_NOTICES.md` and `legal/OpenCode-LICENSE.txt`.

Dependency and asset licenses are documented in:

- `THIRD_PARTY_NOTICES.md`
- `THIRD_PARTY_DEPENDENCIES.md`
- `legal/`
- `TRADEMARKS.md`

The source license does not grant rights to use SwiftScale or SwiftCoder
trademarks for a modified distribution.

## Security

Do not report suspected vulnerabilities in a public issue. Follow the private
reporting instructions in `SECURITY.md`.

Contribution and support expectations are documented in `CONTRIBUTING.md`,
`CODE_OF_CONDUCT.md`, and `SUPPORT.md`.
