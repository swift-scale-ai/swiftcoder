import { describe, expect, test } from "bun:test"
import {
  effectiveSwiftScaleProductMode,
  filterSwiftScaleModelsByProductMode,
  filterSwiftScaleModelsByProducts,
  isCommercialSwiftScaleModel,
  isSwiftCoderTextModel,
  swiftScaleProductAccess,
} from "./swiftscale-model-access"

describe("SwiftScale model access", () => {
  test("recognizes supported commercial model families", () => {
    expect(isCommercialSwiftScaleModel({ id: "gpt-5.4", name: "GPT-5.4" })).toBe(true)
    expect(isCommercialSwiftScaleModel({ id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet" })).toBe(true)
    expect(isCommercialSwiftScaleModel({ id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" })).toBe(true)
    expect(isCommercialSwiftScaleModel({ id: "swiftlite.auto", name: "SwiftScale" })).toBe(false)
  })

  test("excludes media generation models from SwiftCoder", () => {
    expect(isSwiftCoderTextModel({ id: "swiftaudio.auto" })).toBe(false)
    expect(isSwiftCoderTextModel({ id: "swiftimage.auto" })).toBe(false)
    expect(isSwiftCoderTextModel({ id: "swift-audio.auto" })).toBe(false)
    expect(isSwiftCoderTextModel({ id: "swift/image-v1" })).toBe(false)
    expect(isSwiftCoderTextModel({ id: "swiftagent.auto" })).toBe(true)
    expect(filterSwiftScaleModelsByProducts([{ id: "swiftaudio.auto" }, { id: "swiftagent.auto" }])).toEqual([
      { id: "swiftagent.auto" },
    ])
  })

  test("uses entitlements before connection inference", () => {
    expect(swiftScaleProductAccess({ entitlementProduct: "coding", providerConnected: true })).toEqual({
      coding: true,
      apiServices: false,
      known: true,
    })
    expect(swiftScaleProductAccess({ accountPlan: "api_services", providerConnected: false }).apiServices).toBe(true)
    expect(swiftScaleProductAccess({ providerConnected: true }).apiServices).toBe(true)
    expect(
      swiftScaleProductAccess({
        entitlementProduct: "coding",
        products: { coding: true, apiServices: true },
        providerConnected: true,
      }),
    ).toEqual({ coding: true, apiServices: true, known: true })
  })

  test("filters models to the enabled account products", () => {
    const models = [{ id: "swiftlite.auto" }, { id: "swiftmax.auto" }, { id: "gpt-5.4" }, { id: "claude-sonnet-4-6" }]

    expect(
      filterSwiftScaleModelsByProducts(models, {
        coding: { enabled: true, models: ["swiftlite.auto"] },
        apiServices: { enabled: false, models: ["gpt-5.4"] },
      }),
    ).toEqual([{ id: "swiftlite.auto" }])

    expect(
      filterSwiftScaleModelsByProducts(models, {
        coding: { enabled: false, models: [] },
        apiServices: { enabled: true, models: ["openai/gpt-5.4", "anthropic/claude-sonnet-4-6"] },
      }),
    ).toEqual([{ id: "gpt-5.4" }, { id: "claude-sonnet-4-6" }])
  })

  test("combines model access when both products are enabled", () => {
    const models = [
      { id: "swiftpro.auto" },
      { id: "gemini-3.1-pro" },
      { id: "gpt-5.4" },
      { id: "swiftaudio.auto" },
      { id: "swiftimage.auto" },
    ]
    expect(
      filterSwiftScaleModelsByProducts(models, {
        coding: { enabled: true, models: ["swiftpro.auto"] },
        apiServices: { enabled: true, models: ["gemini-3.1-pro", "swiftaudio.auto", "swiftimage.auto"] },
      }),
    ).toEqual([{ id: "swiftpro.auto" }, { id: "gemini-3.1-pro" }])
  })

  test("separates combined accounts into explicit included and PAYG modes", () => {
    const models = [{ id: "swiftlite.auto" }, { id: "swiftpro.auto" }, { id: "gpt-5.6-sol" }, { id: "claude-sonnet-5" }]
    const products = {
      coding: { enabled: true, models: ["swiftlite.auto"] },
      apiServices: {
        enabled: true,
        models: ["swiftlite.auto", "swiftpro.auto", "gpt-5.6-sol", "claude-sonnet-5"],
      },
    }

    expect(effectiveSwiftScaleProductMode(products, "coding")).toBe("coding")
    expect(filterSwiftScaleModelsByProductMode(models, products, "coding")).toEqual([{ id: "swiftlite.auto" }])
    expect(filterSwiftScaleModelsByProductMode(models, products, "api_services")).toEqual([
      { id: "swiftpro.auto" },
      { id: "gpt-5.6-sol" },
      { id: "claude-sonnet-5" },
    ])
  })

  test("forces the only enabled product regardless of a stale project preference", () => {
    const apiOnly = {
      coding: { enabled: false, models: [] },
      apiServices: { enabled: true, models: ["swiftlite.auto"] },
    }
    expect(effectiveSwiftScaleProductMode(apiOnly, "coding")).toBe("api_services")
    expect(filterSwiftScaleModelsByProductMode([{ id: "swiftlite.auto" }], apiOnly, "coding")).toEqual([
      { id: "swiftlite.auto" },
    ])
  })

  test("uses the account-scoped Gateway catalog for legacy API Services entitlements", () => {
    const models = [
      { id: "swiftagent.auto" },
      { id: "gpt-5.4" },
      { id: "claude-sonnet-4-6" },
      { id: "swiftaudio.auto" },
      { id: "swiftimage.auto" },
    ]

    expect(
      filterSwiftScaleModelsByProducts(models, {
        coding: { enabled: false, models: [] },
        apiServices: { enabled: true, models: [] },
      }),
    ).toEqual([{ id: "swiftagent.auto" }, { id: "gpt-5.4" }, { id: "claude-sonnet-4-6" }])
  })

  test("does not infer model access for an empty Coding Plan entitlement", () => {
    expect(
      filterSwiftScaleModelsByProducts([{ id: "swiftlite.auto" }], {
        coding: { enabled: true, models: [] },
        apiServices: { enabled: false, models: [] },
      }),
    ).toEqual([])
  })
})
