# SwiftCoder CLI

SwiftCoder CLI is the terminal interface to the same local coding-agent engine
used by SwiftCoder Desktop. It is intended for developers who work primarily
in a terminal, connect over SSH, run tasks in containers, or need structured
output for automation.

## Capabilities

- Interactive coding sessions in a repository.
- One-shot, non-interactive tasks with human-readable or JSON event output.
- SwiftScale OAuth login and account-aware model access.
- Shared local sessions, tools, permission policies, MCP servers, and provider
  configuration.
- Headless server mode and attachment to an existing SwiftCoder server.
- Native binaries for macOS, Linux, and Windows release targets.

## Install from source

SwiftCoder uses the sibling SwiftCore checkout recorded in `.swiftcore-ref`.
With `swiftcoder` and `swiftcore` next to each other:

```text
swiftscale-agent/
├── swiftcoder/
└── swiftcore/
```

run:

```bash
cd swiftcoder
./tools/bootstrap.sh
bun run cli:install
```

The installer writes to `~/.local/bin` by default. Override the destination
when required:

```bash
SWIFTCODER_INSTALL_DIR=/usr/local/bin bun run cli:install
```

If `~/.local/bin` is not already available in the shell, add it to `PATH`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Install a release binary

Install the latest macOS or Linux release with the public installer:

```bash
curl -fsSL https://swiftscale.app/swiftcoder/install.sh | sh
```

Install a specific version or choose another destination:

```bash
curl -fsSL https://swiftscale.app/swiftcoder/install.sh | \
  SWIFTCODER_VERSION=0.3.0 SWIFTCODER_INSTALL_DIR="$HOME/bin" sh
```

On Windows PowerShell:

```powershell
irm https://swiftscale.app/swiftcoder/install.ps1 | iex
```

The installers detect the operating system, CPU architecture, AVX2 support,
and Linux libc variant, then verify the selected archive against the SHA-256
checksums published with the release.

### Manual installation

Tagged GitHub releases contain architecture-specific archives such as:

- `swiftcoder-darwin-arm64.zip`
- `swiftcoder-darwin-x64.zip`
- `swiftcoder-linux-arm64.tar.gz`
- `swiftcoder-linux-x64.tar.gz`
- `swiftcoder-windows-x64.zip`

Extract the archive for the current platform and place `swiftcoder` (or
`swiftcoder.exe`) somewhere on `PATH`.

## Sign in

Start SwiftScale device authorization from the terminal:

```bash
swiftcoder login
```

The CLI opens the SwiftScale authorization page and prints the verification
URL and device code. The resulting credentials are stored in SwiftCoder's
local account database. To manage multiple accounts or organizations:

```bash
swiftcoder account orgs
swiftcoder account switch
swiftcoder logout
```

The older `swiftcoder console ...` spelling remains available as a compatibility
alias for `swiftcoder account ...`.

## Interactive usage

Open SwiftCoder in the current repository:

```bash
swiftcoder
```

Open a specific directory:

```bash
swiftcoder /path/to/repository
```

The interactive terminal interface supports project context, sessions, tool
calls, permissions, model selection, and review of file changes.

## One-shot and automation usage

Execute a task and stream formatted progress:

```bash
swiftcoder run "Find the failing tests, fix the cause, and verify the result"
```

Run against another directory:

```bash
swiftcoder run "Review the current branch" --dir /path/to/repository
```

Emit newline-delimited JSON events for scripts and CI:

```bash
swiftcoder run "Review this pull request" --format json
```

Continue a session:

```bash
swiftcoder run --continue "Continue with the next failing test"
swiftcoder run --session SESSION_ID "Apply the proposed fix"
```

Permission auto-approval is available for controlled automation but should not
be enabled for untrusted repositories:

```bash
swiftcoder run "Run the verification suite" --auto
```

## Models and providers

List the models available to the active SwiftScale account and current
configuration:

```bash
swiftcoder models
```

Provider credentials, when needed, are managed separately from SwiftScale
account login:

```bash
swiftcoder providers list
swiftcoder providers login
swiftcoder providers logout PROVIDER
```

SwiftScale OAuth access and direct provider API keys are not interchangeable.
The effective model catalog remains constrained by the active account's
entitlements and the selected provider configuration.

## Sessions

```bash
swiftcoder session list
swiftcoder session list --format json
swiftcoder session delete SESSION_ID
```

## Headless server

Start a reusable local server and connect another terminal to it:

```bash
swiftcoder serve --port 4096
swiftcoder attach http://localhost:4096
```

Use `SWIFTCODER_SERVER_PASSWORD` when exposing a server beyond a trusted local
environment.

## Development and verification

Run the TypeScript entry point without compiling a binary:

```bash
bun run cli:dev -- --help
```

Build a native binary for the current machine:

```bash
bun run cli:build
```

Run the CLI type check, native build, and command smoke tests:

```bash
bun run cli:check
```

Generated local artifacts are written to `.artifacts/cli/` and remain ignored
by Git.
