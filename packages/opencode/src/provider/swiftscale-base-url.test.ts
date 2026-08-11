import { expect, test } from "bun:test"
import { resolveSwiftScaleBaseURL } from "./swiftscale-base-url"

test("uses the production SwiftScale Gateway by default", () => {
  expect(resolveSwiftScaleBaseURL({})).toBe("https://api.swift-scale.com/v1")
})

test("allows dev Gateway configuration without overriding explicit provider config", () => {
  expect(resolveSwiftScaleBaseURL({ environment: "https://api-dev.swift-scale.com/v1/" })).toBe(
    "https://api-dev.swift-scale.com/v1",
  )
  expect(
    resolveSwiftScaleBaseURL({
      environment: "https://api-dev.swift-scale.com/v1",
      configured: "http://127.0.0.1:8789/v1/",
    }),
  ).toBe("http://127.0.0.1:8789/v1")
})
