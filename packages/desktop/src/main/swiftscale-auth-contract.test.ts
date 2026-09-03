import { describe, expect, test } from "bun:test"
import {
  SWIFTSCALE_CALLBACK_URL,
  accountEndpoints,
  authEndpoints,
  createAuthorizationURL,
  createPKCE,
  credentialEnvelope,
  parseAccountProfileResponse,
  parseAuthCallback,
  parseEntitlementsResponse,
  parseTokenResponse,
} from "./swiftscale-auth-contract"

describe("SwiftScale desktop OAuth contract", () => {
  test("creates an S256 authorization request", () => {
    const pkce = createPKCE()
    const url = new URL(
      createAuthorizationURL({ endpoint: "https://api.swift-scale.com/v1/auth/desktop/authorize", ...pkce }),
    )

    expect(url.origin).toBe("https://api.swift-scale.com")
    expect(url.searchParams.get("redirect_uri")).toBe(SWIFTSCALE_CALLBACK_URL)
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")
    expect(url.searchParams.get("code_challenge")).toBe(pkce.challenge)
    expect(pkce.verifier).not.toBe(pkce.challenge)
  })

  test("uses the public consent page and account API in production", () => {
    expect(authEndpoints()).toEqual({
      authorize: "https://swift-scale.com/swiftcoder/authorize/",
      token: "https://swift-scale.com/v1/auth/desktop/token",
      revoke: "https://swift-scale.com/v1/auth/desktop/revoke",
    })
    expect(accountEndpoints().entitlements).toBe("https://swift-scale.com/v1/account/entitlements")
    expect(accountEndpoints().profile).toBe("https://swift-scale.com/v1/auth/me")
  })

  test("reads the latest cloud display name without changing the product plan", () => {
    expect(
      parseAccountProfileResponse(
        {
          user: { id: "acct_1", email: "developer@example.com" },
          member: { display_name: "Updated Developer" },
        },
        { id: "acct_1", email: "developer@example.com", name: "Old Name", plan: "api_services" },
      ),
    ).toEqual({
      id: "acct_1",
      email: "developer@example.com",
      name: "Updated Developer",
      plan: "api_services",
    })
  })

  test("allows development to separate the public consent page from the account API", () => {
    process.env.SWIFTCODER_AUTHORIZATION_URL = "https://dev.swift-scale.com/swiftcoder/authorize/"
    process.env.SWIFTCODER_AUTH_BASE_URL = "https://admin-dev.swift-scale.com/v1/auth/desktop"
    try {
      expect(authEndpoints()).toEqual({
        authorize: "https://dev.swift-scale.com/swiftcoder/authorize",
        token: "https://admin-dev.swift-scale.com/v1/auth/desktop/token",
        revoke: "https://admin-dev.swift-scale.com/v1/auth/desktop/revoke",
      })
    } finally {
      delete process.env.SWIFTCODER_AUTHORIZATION_URL
      delete process.env.SWIFTCODER_AUTH_BASE_URL
    }
  })

  test("only accepts the SwiftCoder auth callback", () => {
    expect(parseAuthCallback("swiftcoder://auth/callback?code=ok&state=state")).toEqual({
      code: "ok",
      state: "state",
      error: undefined,
      errorDescription: undefined,
    })
    expect(parseAuthCallback("swiftcoder://open-project?code=ok")).toBeUndefined()
    expect(parseAuthCallback("https://swift-scale.com/auth/callback?code=ok")).toBeUndefined()
  })

  test("validates and converts token responses", () => {
    const token = parseTokenResponse({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
      account: { id: "acct_1", email: "dev@swift-scale.com", plan: "coding" },
    })
    const saved = credentialEnvelope(token)
    expect(saved.auth).toMatchObject({ type: "oauth", access: "access", refresh: "refresh", accountId: "acct_1" })
    expect(saved.account.plan).toBe("coding")
    expect(() => parseTokenResponse({ access_token: "access" })).toThrow("invalid token response")
  })

  test("validates Phase 4 account entitlements", () => {
    expect(
      parseEntitlementsResponse(
        {
          tier: "pro",
          product: "coding",
          subscription: "active",
          usage: { level: "available", resets_at: "2026-09-01T00:00:00Z" },
          limits: { concurrent_tasks: 4, context_tier: "maximum" },
          service: { status: "operational" },
        },
        "req_1",
      ),
    ).toMatchObject({
      tier: "pro",
      limits: { concurrentTasks: 4 },
      products: { coding: { enabled: true }, apiServices: { enabled: false } },
      requestID: "req_1",
    })
    expect(
      parseEntitlementsResponse({
        tier: "pro",
        product: "coding",
        subscription: "active",
        usage: { level: "available" },
        limits: { concurrent_tasks: 4, context_tier: "maximum" },
        service: { status: "operational" },
        products: {
          coding: { enabled: true, models: ["swiftlite.auto"], tier: "pro", subscription: "active" },
          api_services: {
            enabled: true,
            models: ["gpt-5.4"],
            billing: "payg",
            account_tier: "business",
            concurrency_limit: 80,
          },
        },
      }).products,
    ).toEqual({
      coding: { enabled: true, models: ["swiftlite.auto"], tier: "pro", subscription: "active" },
      apiServices: {
        enabled: true,
        models: ["gpt-5.4"],
        billing: "payg",
        accountTier: "business",
        concurrencyLimit: 80,
      },
    })
    expect(() => parseEntitlementsResponse({ tier: "enterprise", usage: {}, limits: {}, service: {} })).toThrow(
      "invalid account entitlements",
    )
    expect(
      parseEntitlementsResponse(
        {
          tier: "free",
          product: "coding",
          subscription: "active",
          usage: { level: "available" },
          limits: { concurrent_tasks: 1, context_tier: "standard" },
          service: { status: "operational" },
        },
        "unsafe request id\nsecret",
      ).requestID,
    ).toBeUndefined()
  })

  test("accepts API Services entitlements without coding plan fields", () => {
    expect(
      parseEntitlementsResponse({
        tier: "free",
        product: "api_services",
        subscription: "active",
        usage: { level: "available" },
        limits: { concurrent_tasks: 1, context_tier: "standard" },
        service: { status: "operational" },
        products: {
          coding: { enabled: false, models: [] },
          api_services: {
            enabled: true,
            models: ["gpt-5.6-sol", "claude-sonnet-5", "gemini-3.1-pro"],
            billing: "payg",
            account_tier: "developer",
          },
        },
      }).products,
    ).toEqual({
      coding: { enabled: false, models: [] },
      apiServices: {
        enabled: true,
        models: ["gpt-5.6-sol", "claude-sonnet-5", "gemini-3.1-pro"],
        billing: "payg",
        accountTier: "developer",
      },
    })
  })

  test("normalizes the legacy personal API Services tier to developer", () => {
    expect(
      parseEntitlementsResponse({
        tier: "free",
        product: "api_services",
        subscription: "active",
        usage: { level: "available" },
        limits: { concurrent_tasks: 1, context_tier: "standard" },
        service: { status: "operational" },
        products: {
          coding: { enabled: false, models: [] },
          api_services: {
            enabled: true,
            models: ["swiftpro.auto"],
            billing: "payg",
            account_tier: "personal",
            concurrency_limit: 3,
          },
        },
      }).products?.apiServices.accountTier,
    ).toBe("developer")
  })
})
