import { describe, expect, test } from "bun:test"
import { createOpenAI } from "@ai-sdk/openai"

describe("OpenAI SDK service tier compatibility", () => {
  for (const api of ["chat", "responses"] as const) {
    test(`${api} does not apply legacy priority-model gating to ultrafast`, async () => {
      const bodies: Record<string, unknown>[] = []
      const openai = createOpenAI({
        apiKey: "test",
        fetch: Object.assign(
          async (url: RequestInfo | URL, init?: RequestInit) => {
            bodies.push(await new Request(url, init).json())
            return new Response("data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } })
          },
          { preconnect: globalThis.fetch.preconnect },
        ),
      })
      const model = api === "chat" ? openai.chat("gpt-4o-mini") : openai.responses("gpt-4o-mini")
      const { stream } = await model.doStream({
        prompt: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
        providerOptions: { openai: { serviceTier: "ultrafast" } },
      })
      await stream.cancel()
      expect(bodies).toHaveLength(1)
      expect(bodies[0].service_tier).toBe("ultrafast")
    })
  }

  for (const api of ["chat", "responses"] as const) {
    for (const tier of [undefined, "priority", "ultrafast"] as const) {
      test(`${api} transmits ${tier ?? "no default"} service tier`, async () => {
        const bodies: Record<string, unknown>[] = []
        const openai = createOpenAI({
          apiKey: "test",
          fetch: Object.assign(
            async (url: RequestInfo | URL, init?: RequestInit) => {
              bodies.push(await new Request(url, init).json())
              return new Response("data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } })
            },
            { preconnect: globalThis.fetch.preconnect },
          ),
        })
        const model = api === "chat" ? openai.chat("gpt-5") : openai.responses("gpt-5")
        const { stream } = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
          ...(tier ? { providerOptions: { openai: { serviceTier: tier } } } : {}),
        })
        await stream.cancel()
        expect(bodies).toHaveLength(1)
        if (tier) expect(bodies[0].service_tier).toBe(tier)
        else expect(bodies[0]).not.toHaveProperty("service_tier")
      })
    }
  }
})
