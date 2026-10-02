import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import desktopPackage from "../package.json"

export function resolveBuildVersion(channel: string, explicit = process.env.SWIFTCODER_VERSION): string {
  if (explicit?.trim()) return explicit.trim()
  if (channel !== "dev") return desktopPackage.version
  let tags: string[] = []
  try {
    tags = execFileSync("git", ["tag", "--merged", "HEAD", "--list", "v*"], {
      cwd: fileURLToPath(new URL("../../../", import.meta.url)),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim().split(/\s+/).map((tag) => tag.replace(/^v/, ""))
  } catch {
    // Source archives have no Git metadata; retain the package version baseline.
  }
  const version = [desktopPackage.version, ...tags]
    .filter((value) => /^\d+\.\d+\.\d+$/.test(value))
    .sort((a, b) => {
      const left = a.split(".").map(Number)
      const right = b.split(".").map(Number)
      return right[0] - left[0] || right[1] - left[1] || right[2] - left[2]
    })[0]
  return `${version}-dev`
}
