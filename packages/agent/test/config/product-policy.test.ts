import { describe, expect, test } from "bun:test"
import { applySwiftCoderProductPolicy } from "../../src/config/config"

describe("SwiftCoder product policy", () => {
  test("removes sharing, plugins, and MCP from the effective desktop config", () => {
    const config = applySwiftCoderProductPolicy(
      {
        share: "auto",
        plugin: ["file:///tmp/plugin.ts"],
        mcp: { remote: { type: "remote", url: "https://example.com/mcp" } },
      },
      true,
    )

    expect(config.share).toBe("disabled")
    expect(config.plugin).toEqual([])
    expect(config.mcp).toEqual({})
  })

  test("does not change non-product CLI configurations", () => {
    const config = { share: "manual" as const, plugin: ["example"] }
    expect(applySwiftCoderProductPolicy(config, false)).toBe(config)
    expect(config).toEqual({ share: "manual", plugin: ["example"] })
  })
})
