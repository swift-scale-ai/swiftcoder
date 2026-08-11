import { expect, test } from "bun:test"
import { join } from "node:path"
import { localDataPaths } from "./local-data"

test("local data cleanup covers desktop, service data, config, cache, and state", () => {
  expect(
    localDataPaths("/tmp/desktop", {
      XDG_DATA_HOME: "/tmp/data",
      XDG_CONFIG_HOME: "/tmp/config",
      XDG_CACHE_HOME: "/tmp/cache",
      XDG_STATE_HOME: "/tmp/state",
    }),
  ).toEqual([
    "/tmp/desktop",
    join("/tmp/data", "swiftcoder"),
    join("/tmp/config", "swiftcoder"),
    join("/tmp/cache", "swiftcoder"),
    join("/tmp/state", "swiftcoder"),
  ])
})
