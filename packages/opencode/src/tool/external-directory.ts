import path from "path"
import { Effect } from "effect"
import { InstanceState } from "@/effect/instance-state"
import type * as Tool from "./tool"
import { containsPath } from "../project/instance-context"
import { FSUtil } from "@swiftscale/core/fs-util"

type Kind = "file" | "directory"

type Options = {
  bypass?: boolean
  kind?: Kind
}

export const assertExternalDirectoryEffect = Effect.fn("Tool.assertExternalDirectory")(function* (
  ctx: Tool.Context,
  target?: string,
  options?: Options,
) {
  if (!target) return false

  if (options?.bypass) return false

  const ins = yield* InstanceState.context
  const resolved = path.resolve(ins.directory, target)
  const canonical = FSUtil.resolve(resolved)
  const full = process.platform === "win32" ? FSUtil.normalizePath(canonical) : canonical
  if (containsPath(full, ins)) return false

  const kind = options?.kind ?? "file"
  // Check containment against the canonical path, but keep the caller's path
  // for permission matching so an explicitly approved symlink alias remains valid.
  const requested = process.platform === "win32" ? FSUtil.normalizePath(resolved) : resolved
  const dir = kind === "directory" ? requested : path.dirname(requested)
  const glob =
    process.platform === "win32"
      ? FSUtil.normalizePathPattern(path.join(dir, "*"))
      : path.join(dir, "*").replaceAll("\\", "/")

  yield* ctx.ask({
    permission: "external_directory",
    patterns: [glob],
    always: [glob],
    metadata: {
      filepath: full,
      parentDir: kind === "directory" ? full : path.dirname(full),
    },
  })
  return true
})

export async function assertExternalDirectory(ctx: Tool.Context, target?: string, options?: Options) {
  return Effect.runPromise(assertExternalDirectoryEffect(ctx, target, options))
}
