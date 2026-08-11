import { describe, expect, test } from "bun:test"
import { tokenEndpoint } from "./macos-keychain"

describe("macOS Keychain SwiftScale OAuth", () => {
  test("refreshes through the production account API", () => {
    expect(tokenEndpoint()).toBe("https://admin-api.swift-scale.com/v1/auth/desktop/token")
  })

  test("supports an explicit development or mock account API", () => {
    expect(tokenEndpoint("https://admin-dev.swift-scale.com/v1/auth/desktop/")).toBe(
      "https://admin-dev.swift-scale.com/v1/auth/desktop/token",
    )
  })
})
