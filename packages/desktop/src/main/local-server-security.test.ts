import { describe, expect, test } from "bun:test"
import { parseLoopbackServerUrl } from "./local-server-security"

describe("local Agent Server URL policy", () => {
  test("accepts HTTP loopback endpoints with an explicit port", () => {
    expect(parseLoopbackServerUrl("http://127.0.0.1:4096")).toBe("http://127.0.0.1:4096")
    expect(parseLoopbackServerUrl("http://localhost:4096/")).toBe("http://localhost:4096")
    expect(parseLoopbackServerUrl("http://[::1]:4096")).toBe("http://[::1]:4096")
  })

  test("rejects remote, unencrypted-websocket, and implicit-port endpoints", () => {
    expect(parseLoopbackServerUrl("https://swift-scale.com:443")).toBeUndefined()
    expect(parseLoopbackServerUrl("http://192.168.1.10:4096")).toBeUndefined()
    expect(parseLoopbackServerUrl("ws://127.0.0.1:4096")).toBeUndefined()
    expect(parseLoopbackServerUrl("http://127.0.0.1")).toBeUndefined()
  })
})
