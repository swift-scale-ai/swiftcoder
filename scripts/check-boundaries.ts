import { readFile, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const forbidden = ["@swiftscale/swiftcoder", "@swiftscale/swiftworks"]
const roots = [join(dirname(fileURLToPath(import.meta.url)), "..", "packages")]
const failures: string[] = []
const desktopKitProductTerms = /\b(?:swiftcoder|swiftworks|opencode|git|lsp|pty|worktree)\b/i

async function visit(path: string) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (["node_modules", "dist", ".turbo"].includes(entry.name)) continue
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
