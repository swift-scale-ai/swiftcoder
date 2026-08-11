import { describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { createMockSwiftScaleHandler } from "./mock-swiftscale"

const handler = createMockSwiftScaleHandler()
const request = (path: string, init?: RequestInit) => handler(new Request(`http://mock.swift-scale.com${path}`, init))

describe("SwiftScale desktop mock contract", () => {
  test("enforces PKCE and returns plan entitlements", async () => {
    const verifier = "phase1-verifier-with-enough-entropy-for-the-contract"
    const challenge = createHash("sha256").update(verifier).digest("base64url")
    const authorize = new URL("http://mock.swift-scale.com/v1/auth/desktop/authorize")
    authorize.search = new URLSearchParams({
      client_id: "swiftcoder-desktop",
      redirect_uri: "swiftcoder://auth/callback",
      response_type: "code",
      state: "state-one",
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString()
    const redirect = await handler(new Request(authorize))
    const callback = new URL(redirect.headers.get("location")!)
    const token = await request("/v1/auth/desktop/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: "swiftcoder-desktop",
        redirect_uri: "swiftcoder://auth/callback",
        code: callback.searchParams.get("code")!,
        code_verifier: verifier,
      }),
    })
    expect(token.status).toBe(200)
    const credentials = (await token.json()) as { access_token: string }
    const models = await request("/v1/models", { headers: { authorization: `Bearer ${credentials.access_token}` } })
    expect(await models.json()).toMatchObject({ product_type: "coding", data: [{ id: "swiftlite.auto" }] })
    const entitlements = await request("/v1/account/entitlements?tier=pro", {
      headers: { authorization: `Bearer ${credentials.access_token}` },
    })
    expect(await entitlements.json()).toMatchObject({
      tier: "pro",
      product: "coding",
      limits: { concurrent_tasks: 2, context_tier: "extended" },
    })
  })

  test("returns Swift, GPT, Claude, and Gemini models for API Services", async () => {
    const models = await request("/v1/models", {
      headers: { authorization: "Bearer mock_access_api_services_test" },
    })

    expect(await models.json()).toMatchObject({
      product_type: "api_services",
      data: [
        { id: "swift.auto" },
        { id: "swiftpro.auto" },
        { id: "gpt-5.4" },
        { id: "claude-sonnet-4-6" },
        { id: "gemini-3.1-pro" },
      ],
    })
  })

  test("streams Responses events, tool calls, request and trace IDs", async () => {
    const response = await request("/v1/responses", {
      method: "POST",
      headers: { authorization: "Bearer mock_access_coding_test", "content-type": "application/json" },
      body: JSON.stringify({ model: "swiftscale", input: "Inspect README.md", stream: true }),
    })
    const body = await response.text()
    expect(response.headers.get("x-request-id")).toBeTruthy()
    expect(response.headers.get("x-swiftscale-trace-id")).toStartWith("trace_")
    expect(body).toContain("event: response.output_text.delta")
    expect(body).toContain("event: response.function_call_arguments.done")
    expect(body).toContain("event: response.completed")
  })

  test("returns structured authentication errors", async () => {
    const response = await request("/v1/models")
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: "unauthorized", message: "A valid SwiftScale token is required" },
    })
  })
})
