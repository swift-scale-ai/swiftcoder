#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { promises as fs } from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const required = [
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "THIRD_PARTY_DEPENDENCIES.md",
  "TRADEMARKS.md",
  "SECURITY.md",
  "SUPPORT.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "legal/OpenCode-LICENSE.txt",
  "legal/models.dev-LICENSE.txt",
  "legal/FONT-LICENSES.md",
  ".github/workflows/verify.yml",
  ".github/dependabot.yml",
]

for (const file of required) {
  const stat = await fs.stat(path.join(root, file)).catch(() => undefined)
  if (!stat?.isFile() || stat.size === 0) throw new Error(`Required public-release file is missing: ${file}`)
}

execFileSync(process.execPath, [path.join(root, "tools/generate-third-party-inventory.mjs"), "--check"], {
  cwd: root,
  stdio: "inherit",
})

const forbiddenTracked = [
  /(^|\/)node_modules\//,
  /(^|\/)(dist|out|coverage|test-results|playwright-report)\//,
  /(^|\/)(\.tmp|\.tools|\.turbo|\.cache)\//,
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)packages\/desktop\/resources\/swiftcoder-cli/,
  /\.(?:dmg|p12|pfx|mobileprovision)$/i,
]

let tracked = []
try {
  tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .split("\0")
    .filter(Boolean)
} catch {
  console.warn("Git index unavailable; tracked-file exclusions will run after this directory is initialized as a repository.")
}

const violations = tracked.filter((file) => forbiddenTracked.some((pattern) => pattern.test(file)))
if (violations.length) throw new Error(`Generated or sensitive files are tracked:\n${violations.join("\n")}`)

const scanRoots = [
  "README.md",
  "SECURITY.md",
  "SUPPORT.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "package.json",
  ".github",
  "tools",
  "packages",
]
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh(?:p|o|u|s|r)_[A-Za-z0-9_]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
]
const ignored = new Set(["node_modules", "dist", "out", ".turbo", ".tools", ".tmp"])

const walk = async (relative) => {
  const absolute = path.join(root, relative)
  const stat = await fs.stat(absolute)
  if (stat.isFile()) return [relative]
  const result = []
  for (const item of await fs.readdir(absolute, { withFileTypes: true })) {
    if (ignored.has(item.name)) continue
    const child = path.join(relative, item.name)
    if (item.isDirectory()) result.push(...(await walk(child)))
    else if (item.isFile()) result.push(child)
  }
  return result
}

for (const file of (await Promise.all(scanRoots.map(walk))).flat()) {
  const absolute = path.join(root, file)
  const stat = await fs.stat(absolute)
  if (stat.size > 8 * 1024 * 1024) continue
  const content = (await fs.readFile(absolute, "utf8").catch(() => "")).replaceAll(
    "AKIAIOSFODNN7EXAMPLE",
    "KNOWN_AWS_DOCUMENTATION_PLACEHOLDER",
  )
  if (secretPatterns.some((pattern) => pattern.test(content))) throw new Error(`Potential credential in ${file}`)
}

console.log("Open-source readiness checks passed.")
