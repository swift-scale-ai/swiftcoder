import { createHash, randomUUID } from "node:crypto"

type Authorization = { challenge: string; redirectURI: string; accountPlan: "coding" | "api_services" }

const json = (body: unknown, status = 200, requestID = randomUUID()) =>
  Response.json(body, { status, headers: { "x-request-id": requestID } })

const bearer = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")

export const createMockSwiftScaleHandler = () => {
  const codes = new Map<string, Authorization>()
  const revoked = new Set<string>()
  return async (request: Request) => {
    const url = new URL(request.url)
    const requestID = request.headers.get("x-request-id") ?? randomUUID()

    if (request.method === "GET" && url.pathname === "/v1/auth/desktop/authorize") {
      const state = url.searchParams.get("state")
      const challenge = url.searchParams.get("code_challenge")
      const redirectURI = url.searchParams.get("redirect_uri")
      if (!state || !challenge || !redirectURI || url.searchParams.get("code_challenge_method") !== "S256") {
        return json(
          { error: { code: "invalid_authorization_request", message: "PKCE S256 is required" } },
          400,
          requestID,
        )
      }
      const code = `mock_code_${randomUUID()}`
      codes.set(code, {
        challenge,
        redirectURI,
        accountPlan: url.searchParams.get("plan") === "api_services" ? "api_services" : "coding",
      })
      const callback = new URL(redirectURI)
      callback.searchParams.set("code", code)
      callback.searchParams.set("state", state)
      return Response.redirect(callback, 302)
    }

    if (request.method === "POST" && url.pathname === "/v1/auth/desktop/token") {
      const form = await request.formData()
      if (form.get("grant_type") === "refresh_token") {
        const refresh = String(form.get("refresh_token") ?? "")
        if (!refresh || revoked.has(refresh)) {
          return json({ error: { code: "invalid_grant", message: "Refresh token is invalid" } }, 401, requestID)
        }
        return json(tokenResponse("coding"), 200, requestID)
      }
      const code = String(form.get("code") ?? "")
      const verifier = String(form.get("code_verifier") ?? "")
      const authorization = codes.get(code)
      const challenge = createHash("sha256").update(verifier).digest("base64url")
      if (
        !authorization ||
        authorization.challenge !== challenge ||
        form.get("redirect_uri") !== authorization.redirectURI
      ) {
        return json(
          { error: { code: "invalid_grant", message: "Authorization code or verifier is invalid" } },
          401,
          requestID,
        )
      }
      codes.delete(code)
      return json(tokenResponse(authorization.accountPlan), 200, requestID)
    }

    if (request.method === "POST" && url.pathname === "/v1/auth/desktop/revoke") {
      const form = await request.formData()
      revoked.add(String(form.get("token") ?? ""))
      return json({ status: "revoked" }, 200, requestID)
    }

    const token = bearer(request)
    if (!token || revoked.has(token)) {
      return json({ error: { code: "unauthorized", message: "A valid SwiftScale token is required" } }, 401, requestID)
    }

    if (request.method === "GET" && url.pathname === "/v1/models") {
      const apiServices = token.includes("api_services")
      const models = apiServices
        ? ["swift.auto", "swiftpro.auto", "gpt-5.4", "claude-sonnet-4-6", "gemini-3.1-pro"]
        : ["swiftlite.auto"]
      return json(
        {
          object: "list",
          product_type: apiServices ? "api_services" : "coding",
          data: models.map((id) => ({ id, object: "model" })),
        },
        200,
        requestID,
      )
    }

    if (request.method === "GET" && url.pathname === "/v1/account/entitlements") {
      const apiServices = token.includes("api_services")
      return json(
        {
          tier:
            url.searchParams.get("tier") === "free" ? "free" : url.searchParams.get("tier") === "pro" ? "pro" : "lite",
          product: apiServices ? "api_services" : "coding",
          subscription: "active",
          usage: { level: "available", resets_at: "2026-09-01T00:00:00Z" },
          limits: { concurrent_tasks: apiServices ? 4 : 2, context_tier: apiServices ? "maximum" : "extended" },
          service: { status: "operational" },
        },
        200,
        requestID,
      )
    }

    if (request.method === "POST" && url.pathname === "/v1/responses") {
      const encoder = new TextEncoder()
      const responseID = `resp_${randomUUID()}`
      const stream = new ReadableStream({
        start(controller) {
          const events = [
            ["response.created", { type: "response.created", response: { id: responseID, status: "in_progress" } }],
            ["response.output_text.delta", { type: "response.output_text.delta", delta: "SwiftCoder mock response" }],
            [
              "response.function_call_arguments.done",
              { type: "response.function_call_arguments.done", name: "read_file", arguments: '{"path":"README.md"}' },
            ],
            ["response.completed", { type: "response.completed", response: { id: responseID, status: "completed" } }],
          ] as const
          for (const [event, data] of events) {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          }
          controller.close()
        },
      })
      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "x-request-id": requestID,
          "x-swiftscale-trace-id": `trace_${randomUUID()}`,
        },
      })
    }

    return json({ error: { code: "not_found", message: "Route not found" } }, 404, requestID)
  }
}

export const createMockSwiftScale = (port = 8789) => {
  return Bun.serve({
    hostname: "127.0.0.1",
    port,
    fetch: createMockSwiftScaleHandler(),
  })
}

const tokenResponse = (plan: "coding" | "api_services") => ({
  access_token: `mock_access_${plan}_${randomUUID()}`,
  refresh_token: `mock_refresh_${randomUUID()}`,
  token_type: "Bearer",
  expires_in: 3600,
  account: { id: "acct_mock", email: "developer@swift-scale.com", name: "SwiftCoder Developer", plan },
})

if (import.meta.main) {
  const requestedPort = Number(process.env.PORT ?? "8789")
  const server = createMockSwiftScale(requestedPort)
  console.log(`SwiftScale desktop mock listening on http://${server.hostname}:${server.port}`)
}
