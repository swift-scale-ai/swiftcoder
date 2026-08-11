import assert from "node:assert/strict"
import test from "node:test"
import { runPhase4ProductionProbe } from "./phase4-production-probe.mjs"

test("production probe validates the commercial path without leaking the token", async () => {
  const seen = []
  const fetch = async (url, init = {}) => {
    seen.push({ url: String(url), authorization: new Headers(init.headers).get("authorization") })
    const headers = { "content-type": "application/json", "x-swiftscale-request-id": "req_probe" }
    if (init.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": new Headers(init.headers).get("origin"),
          "access-control-allow-methods": "GET, POST, OPTIONS",
        },
      })
    }
    if (String(url).endsWith("/account/entitlements")) {
      return Response.json({
        tier: "lite",
        product: "coding",
        subscription: "active",
        usage: { level: "available" },
        limits: { concurrent_tasks: 2, context_tier: "extended" },
        service: { status: "operational" },
      }, { headers })
    }
    if (String(url).endsWith("/v1/models")) return Response.json({ data: [{ id: "swiftlite.auto" }] }, { headers })
    if (String(url).endsWith("latest-mac.yml")) {
      return new Response("version: 1.0.0\nsha512: abc\n", { headers: { "content-type": "text/yaml" } })
    }
    return new Response("ok")
  }
  const result = await runPhase4ProductionProbe({
    fetch,
    accessToken: "secret-token",
    webOrigin: "https://web.example",
    apiOrigin: "https://api.example",
    accountOrigin: "https://account.example",
  })
  assert.equal(result.checks.length, 9)
  assert.equal(seen.find((item) => item.url.endsWith("/account/entitlements")).authorization, "Bearer secret-token")
  assert.doesNotMatch(JSON.stringify(result), /secret-token/)
})

test("telemetry write is opt-in", async () => {
  const methods = []
  await runPhase4ProductionProbe({
    fetch: async (url, init = {}) => {
      methods.push(init.method ?? "GET")
      if (init.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "https://web.example",
            "access-control-allow-methods": "POST, OPTIONS",
          },
        })
      }
      if (String(url).endsWith("latest-mac.yml")) return new Response("version: 1\nsha512: x\n")
      return new Response("ok")
    },
    webOrigin: "https://web.example",
    publicOnly: true,
  })
  assert.deepEqual(methods, ["GET", "GET", "GET", "GET", "GET", "OPTIONS", "GET"])
})

test("production probe rejects a missing Admin CORS allowlist", async () => {
  await assert.rejects(
    runPhase4ProductionProbe({
      fetch: async (url, init = {}) => {
        if (init.method === "OPTIONS") return new Response(null, { status: 204 })
        return new Response("ok")
      },
      webOrigin: "https://web.example",
      publicOnly: true,
    }),
    /Admin CORS: https:\/\/web\.example is not allowed/,
  )
})
