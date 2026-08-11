import { expect, test } from "bun:test"
import { join } from "node:path"
import { scopeDesktopStorageEnv } from "./desktop-storage-env"

test("scopes every XDG storage root to the active desktop account", () => {
  const env: NodeJS.ProcessEnv = {}
  scopeDesktopStorageEnv("/tmp/swiftcoder-account", env)
  const root = join("/tmp/swiftcoder-account", "xdg")
  expect(env.XDG_DATA_HOME).toBe(join(root, "data"))
  expect(env.XDG_CONFIG_HOME).toBe(join(root, "config"))
  expect(env.XDG_CACHE_HOME).toBe(join(root, "cache"))
  expect(env.XDG_STATE_HOME).toBe(join(root, "state"))
})
