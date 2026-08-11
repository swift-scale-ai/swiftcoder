import { rmSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export const DELETE_LOCAL_DATA_ARG = "--swiftcoder-delete-local-data"

export function localDataPaths(userData: string, env: NodeJS.ProcessEnv = process.env) {
  const home = homedir()
  const data = env.XDG_DATA_HOME ?? join(home, ".local", "share")
  const config = env.XDG_CONFIG_HOME ?? join(home, ".config")
  const cache = env.XDG_CACHE_HOME ?? join(home, ".cache")
  const state = env.XDG_STATE_HOME ?? join(home, ".local", "state")
  return [
    ...new Set([
      userData,
      join(data, "swiftcoder"),
      join(config, "swiftcoder"),
      join(cache, "swiftcoder"),
      join(state, "swiftcoder"),
    ]),
  ]
}

export function deleteLocalData(userData: string, env: NodeJS.ProcessEnv = process.env) {
  const deleted = localDataPaths(userData, env)
  for (const path of deleted) rmSync(path, { recursive: true, force: true })
  return deleted
}
