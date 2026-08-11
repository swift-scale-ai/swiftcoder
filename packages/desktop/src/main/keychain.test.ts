import { describe, expect, test } from "bun:test"
import { createMacOSKeychainStore } from "./keychain"

describe("macOS Keychain credential store", () => {
  test("uses generic-password commands without exposing secrets in errors", async () => {
    const calls: string[][] = []
    const store = createMacOSKeychainStore({
      service: "com.swiftscale.swiftcoder.oauth",
      account: "swiftcoder",
      run: async (_file, args) => {
        calls.push(args)
        return { stdout: args[0] === "find-generic-password" ? "stored-value\n" : "" }
      },
    })

    expect(await store.get()).toBe("stored-value")
    await store.set("secret-value")
    await store.remove()
    expect(calls[0]).toEqual([
      "find-generic-password",
      "-a",
      "swiftcoder",
      "-s",
      "com.swiftscale.swiftcoder.oauth",
      "-w",
    ])
    expect(calls[1].at(-2)).toBe("secret-value")
    expect(calls[2][0]).toBe("delete-generic-password")
  })

  test("treats a missing item as signed out", async () => {
    const store = createMacOSKeychainStore({
      service: "service",
      account: "account",
      run: async () => {
        throw Object.assign(new Error("not found"), { code: 44 })
      },
    })
    expect(await store.get()).toBeUndefined()
    await expect(store.remove()).resolves.toBeUndefined()
  })
})

