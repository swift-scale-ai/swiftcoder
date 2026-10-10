import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const packages = join(root, "packages")
const names = new Set<string>()
const productNames = new Set([
  "swiftcoder",
  "@swiftscale/coder-app",
  "@swiftscale/coder-tui",
  "@swiftscale/coder-codemode",
  "@swiftscale/coder-script",
  "@swiftscale/swiftcoder-desktop",
])
const manifests: Array<{ name: string; [key: string]: unknown }> = []
for (const entry of await readdir(packages, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const folder = entry.name === "sdk" ? "sdk/js" : entry.name
  const manifest = JSON.parse(await readFile(join(packages, folder, "package.json"), "utf8"))
  if (names.has(manifest.name)) throw new Error(`Duplicate workspace: ${manifest.name}`)
  names.add(manifest.name)
  manifests.push(manifest)
}

for (const manifest of [JSON.parse(await readFile(join(root, "package.json"), "utf8")), ...manifests]) {
  for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, version] of Object.entries(manifest[field] ?? {})) {
      if (names.has(manifest.name) && !productNames.has(manifest.name) && productNames.has(name)) {
        throw new Error(`${manifest.name}: core package must not depend on product ${name}`)
      }
      if (names.has(name) && version !== "workspace:*") {
        throw new Error(`${manifest.name}: ${name} must use workspace:*`)
      }
      if (typeof version === "string" && /(?:file:|link:).*swiftcore/.test(version)) {
        throw new Error(`${manifest.name}: external SwiftCore dependency ${name}`)
      }
    }
  }
}

await import("../scripts/check-boundaries")
console.log(`SwiftCoder monorepo boundaries are valid (${names.size} workspaces)`)
