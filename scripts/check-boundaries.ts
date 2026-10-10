import { readFile, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const forbidden = [
  "@swiftscale/coder-app",
  "@swiftscale/coder-codemode",
  "@swiftscale/coder-tui",
  "@swiftscale/coder-script",
  "@swiftscale/swiftcoder-desktop",
  "@swiftscale/swiftworks",
]
const packages = join(dirname(fileURLToPath(import.meta.url)), "..", "packages")
const roots = [
  "client",
  "core",
  "desktop-kit",
  "effect-drizzle-sqlite",
  "effect-sqlite-node",
  "http-recorder",
  "httpapi-codegen",
  "llm",
  "plugin",
  "protocol",
  "schema",
  "sdk",
  "server",
  "session-ui",
  "ui",
  "core-script",
].map((name) => join(packages, name))
const failures: string[] = []
const desktopKitProductTerms = /\b(?:swiftcoder|swiftworks|opencode|git|lsp|pty|worktree)\b/i

async function visit(path: string) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (["node_modules", "dist", "out", ".turbo"].includes(entry.name)) continue
    const target = join(path, entry.name)
    if (entry.isDirectory()) {
      await visit(target)
      continue
    }
    if (!/\.(?:ts|tsx|js|jsx|json)$/.test(entry.name)) continue
    const source = await readFile(target, "utf8")
    for (const dependency of forbidden) {
      if (source.includes(dependency)) failures.push(`${target}: imports ${dependency}`)
    }
    if (target.includes(`${join("packages", "desktop-kit")}`) && desktopKitProductTerms.test(source)) {
      failures.push(`${target}: product-specific term leaked into product-neutral desktop kit`)
    }
  }
}

for (const root of roots) await visit(root)

if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("SwiftCore dependency boundaries are valid")
