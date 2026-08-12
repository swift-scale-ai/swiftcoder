# TypeScript 7 Upgrade

SwiftCoder's TypeScript 7 work is isolated on the
`experiment/typescript-7` branch until the desktop application, agent runtime,
and release pipeline have completed regression testing.

## Goals

- Use the stable TypeScript 7 compiler for every workspace type-check task.
- Remove the old `@typescript/native-preview` dependency and `tsgo` commands.
- Preserve runtime compatibility for tools that consume the JavaScript
  TypeScript Compiler API.
- Validate the migration against the Electron desktop build and native
  dependencies instead of treating type-check success as sufficient.

## Compiler And Configuration Changes

- Added `@typescript/native` as an alias for `typescript@7.0.2`. Its `tsc`
  binary is the compiler used by workspace scripts.
- Retained `typescript@6.0.2` as a temporary runtime compatibility dependency
  for packages that import the JavaScript Compiler API.
- Replaced workspace `tsgo` type-check commands with `tsc`.
- Added `@types/bun` and explicit `types: ["bun"]` configuration where Bun
  globals are used.
- Standardized the desktop package on the workspace TypeScript catalog.
- Replaced the legacy `bunx tsc` declaration build invocation with
  `bun x tsc`.
- Removed an invisible zero-width pseudo-element from the prompt input after
  it became visible as `\200B` in the packaged application.

## Dependency Updates

The experiment also validates the following compatible dependency updates:

| Package | Previous | Updated |
| --- | --- | --- |
| `@lydell/node-pty` and macOS binaries | `1.2.0-beta.12` | `1.2.0-beta.15` |
| `@solid-primitives/active-element` | `2.1.3` | `2.1.6` |
| `@solid-primitives/bounds` | `0.1.3` | `0.1.7` |
| `@shikijs/transformers` | `3.9.2` | `4.4.2` |
| `chokidar` | `4.0.3` | `5.0.0` |
| `which` | `6.0.1` | `7.0.0` |
| `@actions/core` | `1.11.1` | `3.0.1` |
| `clipboardy` | `4.0.0` | `5.3.2` |
| `motion-utils` | `12.29.2` | `13.0.0` |

`which@7` requires Node.js `22.22.2` or newer, so the GitHub Actions runtime
and documented local requirement were raised to that version.

## Deferred Update

`@ai-sdk/groq@4.0.26` is not included. Groq 4 implements the AI SDK Provider
v4 model protocol, while SwiftCoder currently uses `ai@6` and Provider v3.
Updating it independently causes a `LanguageModelV4` versus `LanguageModelV3`
contract failure. This package must move as part of a coordinated AI SDK and
provider migration; SwiftCoder therefore remains on `@ai-sdk/groq@3.0.31`.

## Validation

The experiment has passed:

- TypeScript checks for all 20 workspace packages;
- 27 UI unit tests;
- 11 focused `which` and Groq provider tests;
- lint with zero errors;
- a native PTY spawn smoke test;
- the Electron production renderer/main-process build;
- macOS ARM64 development packaging and application startup.

The filesystem watcher suite could not initialize macOS FSEvents inside the
restricted test environment. This is an environment limitation and remains a
required regression check in CI or an unrestricted local environment.

## Local Verification

```bash
bun install --frozen-lockfile
bun turbo typecheck --force
bun run lint
./tools/package-mac-dev.sh
```

Do not merge the experiment into `main` until the packaged application has
also been checked for project loading, session creation, terminal execution,
model switching, and provider authentication.
