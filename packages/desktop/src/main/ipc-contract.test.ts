import { describe, expect, test } from "bun:test"
import { assertIpcArguments, isKnownIpcChannel } from "./ipc-contract"

describe("desktop IPC contract", () => {
  test("accepts known channels with valid arguments", () => {
    expect(() => assertIpcArguments("updater-check", [])).not.toThrow()
    expect(() => assertIpcArguments("set-default-server-url", [null])).not.toThrow()
    expect(() => assertIpcArguments("set-titlebar", [{ mode: "dark", scheme: "system" }])).not.toThrow()
    expect(() => assertIpcArguments("open-file-picker", [{ multiple: true, extensions: ["png", "jpg"] }])).not.toThrow()
    expect(() => assertIpcArguments("record-product-metric", ["task.completed"])).not.toThrow()
    expect(() => assertIpcArguments("swiftscale-entitlements", [true])).not.toThrow()
  })

  test("rejects unknown channels, extra arguments, and malformed values", () => {
    expect(() => assertIpcArguments("unknown", [])).toThrow()
    expect(() => assertIpcArguments("updater-check", [true])).toThrow()
    expect(() => assertIpcArguments("set-zoom-factor", [100])).toThrow()
    expect(() => assertIpcArguments("set-titlebar", [{ mode: "dark", unexpected: true }])).toThrow()
    expect(() => assertIpcArguments("record-product-metric", ["task.started"])).toThrow()
    expect(() => assertIpcArguments("swiftscale-entitlements", [])).toThrow()
  })

  test("prevents store path traversal and oversized renderer data", () => {
    expect(() => assertIpcArguments("store-get", ["../outside", "key"])).toThrow()
    expect(() => assertIpcArguments("open-path", ["bad\0path"])).toThrow()
    expect(() => assertIpcArguments("draft-blob-put", [new ArrayBuffer(50 * 1024 * 1024 + 1)])).toThrow()
    expect(() =>
      assertIpcArguments("record-product-metric", ["task.completed", { prompt: "must never cross IPC" }]),
    ).toThrow()
  })

  test("contains product channels and excludes non-macOS channels", () => {
    expect(isKnownIpcChannel("swiftscale-auth-login")).toBe(true)
    expect(isKnownIpcChannel("run-desktop-menu-action")).toBe(true)
    expect(isKnownIpcChannel("wsl-servers-start")).toBe(false)
    expect(isKnownIpcChannel("set-display-backend")).toBe(false)
  })
})
