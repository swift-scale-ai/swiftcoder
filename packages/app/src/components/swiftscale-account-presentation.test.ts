import { describe, expect, test } from "bun:test"
import type { SwiftScaleEntitlements } from "@/context/platform"
import { swiftScaleAccountDisplayName, swiftScaleAccountPresentation } from "./swiftscale-account-presentation"

const entitlements = (overrides: Partial<SwiftScaleEntitlements> = {}): SwiftScaleEntitlements => ({
  tier: "pro",
  product: "api_services",
  subscription: "active",
  usage: { level: "available" },
  limits: { concurrentTasks: 4, contextTier: "maximum" },
  service: { status: "operational" },
  ...overrides,
})

describe("SwiftScale account presentation", () => {
  test("uses the email username when the stored display name repeats the email", () => {
    expect(
      swiftScaleAccountDisplayName({
        email: "jiqing.zhang@ideashub.io",
        name: "jiqing.zhang@ideashub.io",
      }),
    ).toBe("jiqing.zhang")
  })

  test("keeps a real account display name", () => {
    expect(swiftScaleAccountDisplayName({ email: "jiqing.zhang@ideashub.io", name: "Jiqing Zhang" })).toBe(
      "Jiqing Zhang",
    )
  })

  test("does not present a legacy API Services entitlement as SwiftCoder Pro", () => {
    expect(swiftScaleAccountPresentation(entitlements())).toMatchObject({
      apiOnly: true,
      title: "API Services",
      subtitle: "Pay as you go",
    })
  })

  test("uses product-specific account tiers and combined access", () => {
    expect(
      swiftScaleAccountPresentation(
        entitlements({
          product: "coding",
          products: {
            coding: { enabled: true, models: ["swiftlite.auto"], tier: "lite", subscription: "active" },
            apiServices: { enabled: true, models: [], billing: "payg", accountTier: "business" },
          },
        }),
      ),
    ).toMatchObject({
      apiOnly: false,
      title: "SwiftCoder Lite + API Services",
      subtitle: "Active subscription - API Services PAYG enabled",
    })
  })
})
