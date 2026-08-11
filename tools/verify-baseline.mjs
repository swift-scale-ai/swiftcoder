import { existsSync, lstatSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const baseline = JSON.parse(readFileSync(resolve(root, "UPSTREAM_BASELINE.json"), "utf8"))

const required = [
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "bun.lock",
  "packages/desktop/package.json",
  "packages/app/package.json",
  "packages/opencode/package.json",
]

for (const file of required) {
  if (!existsSync(resolve(root, file))) throw new Error(`Missing Phase 0 file: ${file}`)
}

for (const workspace of baseline.retainedWorkspaces) {
  const target = resolve(root, workspace)
  if (!existsSync(target)) throw new Error(`Missing retained workspace: ${workspace}`)
  if (lstatSync(target).isSymbolicLink()) throw new Error(`Workspace must not be a symlink: ${workspace}`)
}

const desktopMain = readFileSync(resolve(root, "packages/desktop/src/main/index.ts"), "utf8")
const builder = readFileSync(resolve(root, "packages/desktop/electron-builder.config.ts"), "utf8")
const identity = `${desktopMain}\n${builder}`

for (const expected of ["SwiftCoder", "ai.swiftscale.swiftcoder", "swiftcoder://"]) {
  if (!identity.includes(expected)) throw new Error(`Missing SwiftCoder identity: ${expected}`)
}

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
if (packageJson.name !== "swiftcoder") throw new Error("Root package must be named swiftcoder")
if (baseline.upstream.commit !== "284214c78d32a09fd9c729bdefc07be50f74eb40") {
  throw new Error("Unexpected upstream commit")
}

console.log(`SwiftCoder baseline verified: ${baseline.retainedWorkspaces.length} workspaces`)
