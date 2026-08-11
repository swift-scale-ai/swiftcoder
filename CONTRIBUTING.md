# Contributing to SwiftCoder

## Before opening a change

- Use Bun 1.3.14 and Node.js 22.19 or newer.
- Discuss large behavioral or architectural changes in an issue first.
- Do not include credentials, customer data, production logs, generated builds,
  signing material, or telemetry exports.
- Keep third-party source and asset attribution intact.

## Development checks

Install dependencies and run the relevant checks:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run check:open-source
bun run check:security
./tools/check-phase4.sh
```

Add focused tests for behavior changes. A pull request should describe the user
impact, verification performed, and any security, privacy, migration, or license
considerations.

## Security reports

Do not disclose suspected vulnerabilities in a public issue or pull request.
Follow `SECURITY.md` instead.

By contributing, you agree that your contribution is licensed under the
repository's MIT License and that you have the right to submit it.
