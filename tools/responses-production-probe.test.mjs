import assert from "node:assert/strict"
import test from "node:test"
import { runResponsesProductionProbe } from "./responses-production-probe.mjs"

test("validates a real Responses-style SSE contract without exposing the token", async () => {
  const seen = []
  const result = await runResponsesProductionProbe({
    accessToken: "secret-token",
    apiOrigin: "https://api.example",
    fetch: async (url, init = {}) => {
      seen.push({ url: String(url), authorization: new Headers(init.headers).get("authorization") })
      if (String(url).endsWith("/models")) {
        return Response.json({ data: [{ id: "swiftlite.auto" }] })
      }
      return new Response(
        "event: response.output_text.delta\ndata: {\"delta\":\"ready\"}\n\nevent: response.completed\ndata: {}\n\n",
        { headers: { "content-type": "text/event-stream", "x-swiftscale-request-id": "req_stream" } },
      )
    },
  })
  assert.equal(result.model, "swiftlite.auto")
  assert.equal(result.requestID, "req_stream")
  assert.equal(result.streamed, true)
  assert.equal(seen.length, 2)
  assert.ok(seen.every((item) => item.authorization === "Bearer secret-token"))
  assert.doesNotMatch(JSON.stringify(result), /secret-token/)
})
