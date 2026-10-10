import { $ } from "bun"
import { chmod, copyFile, mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

export type Channel = "dev" | "beta" | "prod"

export function resolveChannel(): Channel {
  const raw = Bun.env.SWIFTCODER_CHANNEL
  return raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"
}

export const RUST_TARGET = Bun.env.RUST_TARGET

// Development builds use this repository's CLI, never an upstream executable.
export async function buildCliToResources() {
  const desktop = fileURLToPath(new URL("..", import.meta.url))
  const agent = path.resolve(desktop, "../agent")
  const platform = process.platform === "win32" ? "windows" : process.platform
  const extension = process.platform === "win32" ? ".exe" : ""
  await $`bun script/build.ts --single --skip-install --skip-embed-web-ui`.cwd(agent)
  const source = path.join(agent, `dist/swiftcoder-${platform}-${process.arch}/bin/swiftcoder${extension}`)
  const destination = path.join(desktop, `resources/swiftcoder-cli${extension}`)
  await mkdir(path.dirname(destination), { recursive: true })
  await copyFile(source, destination)
  if (process.platform !== "win32") await chmod(destination, 0o755)
  if (process.platform === "darwin") await $`codesign --force --sign - ${destination}`
  console.log(`Copied local SwiftCoder CLI to ${destination}`)
}

export function windowsify(value: string) {
  return value.endsWith(".exe") ? value : `${value}${process.platform === "win32" ? ".exe" : ""}`
}
