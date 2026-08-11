import { readdir, stat } from "node:fs/promises"
import { join, relative, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const out = join(root, "packages/desktop/out")

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory() ? files(path) : Promise.resolve([path])
    }),
  )
  return nested.flat()
}

const all = await files(out)
const distributable = all.filter((path) => !path.endsWith(".map"))
const sizes = new Map(await Promise.all(distributable.map(async (path) => [path, (await stat(path)).size])))

const sum = (prefix) => [...sizes].reduce((total, [path, size]) => (path.startsWith(prefix) ? total + size : total), 0)
const one = (path) => sizes.get(path) ?? 0
const rendererEntry = [...sizes].filter(([path]) => /\/renderer\/assets\/main-[^/]+[.]js$/.test(path))

const budgets = [
  ["main entry", one(join(out, "main/index.js")), 256 * 1024],
  ["preload", one(join(out, "preload/index.js")), 16 * 1024],
  ["main distributable", sum(join(out, "main")), 40 * 1024 * 1024],
  ["renderer distributable", sum(join(out, "renderer")), 45 * 1024 * 1024],
  ["renderer entry", rendererEntry[0]?.[1] ?? 0, 7 * 1024 * 1024],
]

let failed = false
for (const [name, actual, limit] of budgets) {
  const status = actual > 0 && actual <= limit ? "PASS" : "FAIL"
  console.log(`${status} ${name}: ${(actual / 1024 / 1024).toFixed(2)} MiB / ${(limit / 1024 / 1024).toFixed(2)} MiB`)
  if (status === "FAIL") failed = true
}

const forbidden = ["wsl-servers", "install-wsl", "wsl server initialization"]
for (const path of distributable.filter((path) => path.endsWith(".js"))) {
  const content = await Bun.file(path).text()
  const marker = forbidden.find((value) => content.includes(value))
  if (!marker) continue
  console.error(`FAIL non-macOS marker ${JSON.stringify(marker)} found in ${relative(root, path)}`)
  failed = true
}

if (failed) process.exit(1)
