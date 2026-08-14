import { existsSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const packages = join(root, "packages")
const extracted = [
  "client",
  "core",
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
]
const failures = extracted
  .filter((name) => existsSync(join(packages, name, "package.json")))
  .map((name) => `packages/${name} belongs in SwiftCore`)
const forbidden = ["@swiftscale", "swiftworks"].join("/")

async function visit(path: string) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (["node_modules", "dist", "out", ".turbo"].includes(entry.name)) continue
    const target = join(path, entry.name)
    if (entry.isDirectory()) {
      await visit(target)
      continue
    }
    if (!/\.(?:ts|tsx|js|jsx|json)$/.test(entry.name)) continue
    if ((await Bun.file(target).text()).includes(forbidden)) failures.push(`${target}: imports SwiftWorks`)
  }
}

await visit(packages)

if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("SwiftCoder dependency boundaries are valid")
