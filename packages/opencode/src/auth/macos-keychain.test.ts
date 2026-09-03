import { describe, expect, test } from "bun:test"
import { tokenEndpoint, tolerateRefreshFailure } from "./macos-keychain"

describe("macOS Keychain SwiftScale OAuth", () => {
  test("refreshes through the production account API", () => {
    expect(tokenEndpoint()).toBe("https://swift-scale.com/v1/auth/desktop/token")
  })

  test("supports an explicit development or mock account API", () => {
    expect(tokenEndpoint("https://admin-dev.swift-scale.com/v1/auth/desktop/")).toBe(
      "https://admin-dev.swift-scale.com/v1/auth/desktop/token",
    )
  })

  test("does not block local bootstrap when cloud token refresh fails", async () => {
    expect(await tolerateRefreshFailure(Promise.reject(new Error("SwiftScale token refresh failed (401)")))).toBeUndefined()
    expect(await tolerateRefreshFailure(Promise.resolve({ access: "fresh" }))).toEqual({ access: "fresh" })
  })
})
