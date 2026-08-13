import { describe, expect, test } from "bun:test"
import { accountSummary } from "./account-summary"

const signedIn = {
  state: "signed_in" as const,
  account: { id: "acct_1", email: "dev@example.com", plan: "coding" as const },
  expiresAt: Date.now() + 60_000,
}

const entitlement = {
  tier: "lite" as const,
  product: "coding" as const,
  subscription: "active" as const,
  usage: { level: "available" as const },
  limits: { concurrentTasks: 2, contextTier: "extended" as const },
  service: { status: "operational" as const },
}

describe("accountSummary", () => {
  test("keeps signed-out state actionable", () => {
    expect(accountSummary({ state: "signed_out" })).toEqual({
      label: "Sign in",
      tone: "neutral",
    })
  })

  test("shows tier and usage without exposing account identifiers", () => {
    expect(accountSummary(signedIn, entitlement)).toEqual({
      label: "SwiftCoder Lite",
      detail: "Usage available",
      tone: "available",
    })
  })

  test("uses API Services as the label for API-only accounts even when the legacy tier is pro", () => {
    expect(
      accountSummary(
        { ...signedIn, account: { ...signedIn.account, plan: "api_services" } },
        {
          ...entitlement,
          tier: "pro",
          product: "api_services",
          products: {
            coding: { enabled: false, models: [] },
            apiServices: { enabled: true, models: ["swift.api"], billing: "payg", accountTier: "developer" },
          },
        },
      ),
    ).toEqual({
      label: "API Services",
      detail: "Pay as you go",
      tone: "available",
    })
  })

  test("prioritizes service degradation over usage", () => {
    expect(accountSummary(signedIn, { ...entitlement, service: { status: "outage" } })).toMatchObject({
      detail: "Service outage",
      tone: "critical",
    })
  })
})
