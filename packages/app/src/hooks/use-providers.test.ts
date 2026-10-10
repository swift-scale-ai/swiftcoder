import { expect, test } from "bun:test"
import { popularProviders, supportedProviders } from "./use-providers"

test("OpenScaler is not a supported or suggested product provider", () => {
  expect(popularProviders).toEqual(["swiftcoder", "anthropic", "openai", "google"])
  const input = new Map([
    ["openswiftscale", { name: "OpenScaler" }],
    ["openscaler", { name: "OpenScaler" }],
    ["swiftcoder", { name: "SwiftScale" }],
    ["openai", { name: "OpenAI" }],
  ])

  expect([...supportedProviders(input).keys()]).toEqual(["swiftcoder", "openai"])
  // Filtering the UI must not mutate stored catalog entries or credentials.
  expect(input.has("openswiftscale")).toBe(true)
})
