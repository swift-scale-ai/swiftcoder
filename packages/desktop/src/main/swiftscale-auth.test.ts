import { describe, expect, test } from "bun:test"
import { createSwiftScaleAuthController } from "./swiftscale-auth"
import type { SecureCredentialStore } from "./keychain"

const memoryStore = (): SecureCredentialStore & { value?: string } => ({
  value: undefined,
  async get() {
    return this.value
  },
  async set(value) {
    this.value = value
  },
  async remove() {
    this.value = undefined
  },
})

describe("SwiftScale desktop authentication", () => {
  test("exchanges a PKCE callback and only exposes account status", async () => {
    const store = memoryStore()
    let authorizationURL = ""
    let tokenBody = ""
    const credentialChanges: string[] = []
    const auth = createSwiftScaleAuthController({
      store,
      baseURL: "http://127.0.0.1:9876/v1/auth/desktop",
      openExternal: async (url) => {
        authorizationURL = url
      },
      fetch: (async (_url: string | URL | Request, init?: RequestInit) => {
        tokenBody = String(init?.body)
        return new Response(
          JSON.stringify({
            access_token: "access-secret",
            refresh_token: "refresh-secret",
            expires_in: 3600,
            account: { id: "acct_1", email: "dev@example.com", name: "Developer", plan: "coding" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }) as typeof fetch,
      onCredentialChanged: (reason) => credentialChanges.push(reason),
    })

    expect(await auth.login()).toEqual({ state: "authorizing" })
    const request = new URL(authorizationURL)
    expect(request.searchParams.get("code_challenge_method")).toBe("S256")
    await auth.handleDeepLinks([
      `swiftcoder://auth/callback?code=one-time-code&state=${request.searchParams.get("state")}`,
    ])

    expect(tokenBody).toContain("code_verifier=")
    expect(await auth.status()).toMatchObject({
      state: "signed_in",
      account: { email: "dev@example.com", plan: "coding" },
    })
    expect(JSON.stringify(await auth.status())).not.toContain("access-secret")
    expect(await auth.credentialForSidecar()).toContain("access-secret")
    expect(credentialChanges).toEqual(["login"])
  })

  test("rejects callback state mismatch", async () => {
    const auth = createSwiftScaleAuthController({
      store: memoryStore(),
      openExternal: async () => {},
      fetch: (async () => {
        throw new Error("must not exchange")
      }) as typeof fetch,
    })
    await auth.login()
    await auth.handleDeepLinks(["swiftcoder://auth/callback?code=code&state=wrong"])
    expect(await auth.status()).toEqual({ state: "error", message: "SwiftScale login state did not match" })
  })

  test("refreshes expiring credentials and revokes them on logout", async () => {
    const store = memoryStore()
    store.value = JSON.stringify({
      version: 1,
      auth: { type: "oauth", access: "old", refresh: "refresh-old", expires: 1, accountId: "acct_1" },
      account: { id: "acct_1", email: "dev@example.com", plan: "coding" },
    })
    const requests: string[] = []
    const credentialChanges: string[] = []
    const auth = createSwiftScaleAuthController({
      store,
      now: () => 10_000,
      fetch: (async (url: string | URL | Request) => {
        requests.push(String(url))
        if (String(url).endsWith("/revoke")) return Response.json({ status: "revoked" })
        return Response.json({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
          account: { id: "acct_1", email: "dev@example.com", plan: "coding" },
        })
      }) as typeof fetch,
      onCredentialChanged: (reason) => credentialChanges.push(reason),
    })

    expect(await auth.status()).toMatchObject({ state: "signed_in", expiresAt: 3_610_000 })
    expect(store.value).toContain("new-access")
    expect(await auth.logout()).toEqual({ state: "signed_out" })
    expect(store.value).toBeUndefined()
    expect(requests.some((url) => url.endsWith("/token"))).toBe(true)
    expect(requests.some((url) => url.endsWith("/revoke"))).toBe(true)
    expect(credentialChanges).toEqual(["logout"])
  })

  test("starts without cloud credentials when refresh fails and preserves the saved session", async () => {
    const store = memoryStore()
    store.value = JSON.stringify({
      version: 1,
      auth: { type: "oauth", access: "expired", refresh: "refresh-old", expires: 1, accountId: "acct_1" },
      account: { id: "acct_1", email: "dev@example.com", plan: "api_services" },
    })
    const saved = store.value
    const changes: unknown[] = []
    const auth = createSwiftScaleAuthController({
      store,
      now: () => 10_000,
      fetch: (async () => new Response(null, { status: 401 })) as typeof fetch,
      onChanged: (status) => changes.push(status),
    })

    expect(await auth.credentialForSidecar()).toBeUndefined()
    expect(store.value).toBe(saved)
    expect(await auth.status()).toEqual({ state: "error", message: "SwiftScale authentication failed (401)" })
    expect(changes).toEqual([{ state: "error", message: "SwiftScale authentication failed (401)" }])
  })

  test("caches Phase 4 entitlements and supports an explicit refresh", async () => {
    const store = memoryStore()
    store.value = JSON.stringify({
      version: 1,
      auth: { type: "oauth", access: "access", refresh: "refresh", expires: 100_000, accountId: "acct_1" },
      account: { id: "acct_1", email: "dev@example.com", plan: "coding" },
    })
    const requests: string[] = []
    const auth = createSwiftScaleAuthController({
      store,
      now: () => 1_000,
      apiBaseURL: "http://127.0.0.1:9876/v1",
      fetch: (async (url: string | URL | Request, init?: RequestInit) => {
        requests.push(String(url))
        expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access")
        if (String(url).endsWith("/v1/auth/me")) {
          return Response.json({
            user: { id: "acct_1", email: "dev@example.com" },
            member: { display_name: "Updated Developer" },
          })
        }
        expect(String(url)).toEndWith("/v1/account/entitlements")
        return Response.json(
          {
            tier: "lite",
            product: "coding",
            subscription: "active",
            usage: { level: "limited", resets_at: "2026-09-01T00:00:00Z" },
            limits: { concurrent_tasks: 2, context_tier: "extended" },
            service: { status: "degraded", message: "Responses may be slower" },
          },
          { headers: { "x-request-id": "req_entitlements" } },
        )
      }) as typeof fetch,
    })

    expect(await auth.entitlements()).toMatchObject({ tier: "lite", requestID: "req_entitlements" })
    expect(await auth.entitlements()).toMatchObject({ usage: { level: "limited" } })
    expect(requests).toHaveLength(1)
    await auth.entitlements(true)
    expect(requests.map((url) => new URL(url).pathname)).toEqual([
      "/v1/account/entitlements",
      "/v1/auth/me",
      "/v1/account/entitlements",
    ])
    expect(await auth.status()).toMatchObject({
      state: "signed_in",
      account: { name: "Updated Developer" },
    })
  })

  test("accepts the production SwiftScale request id header", async () => {
    const store = memoryStore()
    store.value = JSON.stringify({
      version: 1,
      auth: { type: "oauth", access: "access", refresh: "refresh", expires: Date.now() + 3_600_000 },
      account: { id: "acct_1", email: "dev@example.com", plan: "coding" },
    })
    const auth = createSwiftScaleAuthController({
      store,
      fetch: (async () =>
        Response.json(
          {
            tier: "pro",
            product: "coding",
            subscription: "active",
            usage: { level: "available" },
            limits: { concurrent_tasks: 4, context_tier: "maximum" },
            service: { status: "operational" },
          },
          { headers: { "x-swiftscale-request-id": "req_production_header" } },
        )) as typeof fetch,
    })
    expect((await auth.entitlements()).requestID).toBe("req_production_header")
  })
})
