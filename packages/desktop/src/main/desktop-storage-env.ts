import { join } from "node:path"

export function scopeDesktopStorageEnv(userDataPath: string, env: NodeJS.ProcessEnv = process.env) {
  const xdgRoot = join(userDataPath, "xdg")
  Object.assign(env, {
    XDG_DATA_HOME: join(xdgRoot, "data"),
    XDG_CONFIG_HOME: join(xdgRoot, "config"),
    XDG_CACHE_HOME: join(xdgRoot, "cache"),
    XDG_STATE_HOME: join(xdgRoot, "state"),
  })
}
