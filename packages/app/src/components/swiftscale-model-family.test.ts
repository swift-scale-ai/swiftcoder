import { describe, expect, test } from "bun:test"
import {
  connectedProviderModelFamily,
  groupSwiftScaleModelsByFamily,
  preferredSwiftScaleModel,
  sortSwiftScaleModelFamilies,
  swiftScaleModelFamily,
  swiftScaleModelFamilyProviderID,
  type SwiftScaleModelFamily,
} from "./swiftscale-model-family"

describe("SwiftScale model families", () => {
  test("classifies commercial and SwiftScale product models", () => {
    expect(swiftScaleModelFamily({ id: "gpt-5.4", name: "GPT-5.4" })).toBe("GPT")
    expect(swiftScaleModelFamily({ id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" })).toBe("Claude")
    expect(swiftScaleModelFamily({ id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" })).toBe("Gemini")
    expect(swiftScaleModelFamily({ id: "swiftlite.auto", name: "Swift Lite" })).toBe("SwiftScale")
  })

  test("keeps the requested family order", () => {
    const families: SwiftScaleModelFamily[] = ["SwiftScale", "Gemini", "GPT", "Claude"]
    expect(families.sort(sortSwiftScaleModelFamilies)).toEqual(["GPT", "Claude", "Gemini", "SwiftScale"])
  })

  test("maps each family to its provider icon", () => {
    expect(swiftScaleModelFamilyProviderID("GPT")).toBe("openai")
    expect(swiftScaleModelFamilyProviderID("Claude")).toBe("anthropic")
    expect(swiftScaleModelFamilyProviderID("Gemini")).toBe("google")
    expect(swiftScaleModelFamilyProviderID("SwiftScale")).toBe("swiftcoder")
  })

  test.each([
    ["openai", "GPT"],
    ["anthropic", "Claude"],
    ["google", "Gemini"],
  ] as const)("maps connected %s models to the %s family", (providerID, family) => {
    expect(
      connectedProviderModelFamily({
        id: "provider-model",
        name: "Provider model",
        provider: { id: providerID },
      }),
    ).toBe(family)
  })

  test("prefers the first SwiftScale model over commercial families", () => {
    const models = [
      { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
      { id: "swift-pro", name: "Swift Pro" },
      { id: "swift-auto", name: "Swift Auto" },
    ]

    expect(preferredSwiftScaleModel(models)).toEqual({ id: "swift-auto", name: "Swift Auto" })
    expect(preferredSwiftScaleModel(models.slice(0, 1))).toEqual(models[0])
  })

  test("groups models by family and omits empty families", () => {
    const groups = groupSwiftScaleModelsByFamily([
      { id: "swift-auto", name: "Swift Auto" },
      { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" },
      { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
    ])

    expect(groups.map((group) => [group.family, group.models.map((model) => model.name)])).toEqual([
      ["GPT", ["GPT-5.6 Sol"]],
      ["Gemini", ["Gemini 3.1 Pro"]],
      ["SwiftScale", ["Swift Auto"]],
    ])
  })
})
