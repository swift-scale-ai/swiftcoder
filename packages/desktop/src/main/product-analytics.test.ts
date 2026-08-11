import { describe, expect, test } from "bun:test"
import { createProductAnalytics } from "./product-analytics"

const memoryStore = () => {
  const values = new Map<string, unknown>()
  return {
    get: (key: string) => values.get(key),
    set: (key: string, value: unknown) => values.set(key, value),
    delete: (key: string) => values.delete(key),
  }
}

describe("product analytics", () => {
  test("is opt-in and sends only the fixed event schema", async () => {
    const store = memoryStore()
    const bodies: string[] = []
    const analytics = createProductAnalytics({
      store,
      uploadAllowed: true,
      fetch: (async (_url: string | URL | Request, init?: RequestInit) => {
        bodies.push(String(init?.body))
        return new Response(null, { status: 204 })
      }) as typeof fetch,
    })
    analytics.record("task.completed")
    expect(bodies).toHaveLength(0)
    await analytics.setEnabled(true)
    analytics.record("task.completed")
    await analytics.flush()
    expect(JSON.parse(bodies[0]!)).toEqual({
      schema: 1,
      events: [{ name: "task.completed", occurredAt: expect.any(String) }],
    })
  })

  test("disabling clears queued events", async () => {
    const store = memoryStore()
    const analytics = createProductAnalytics({ store, uploadAllowed: false })
    await analytics.setEnabled(true)
    analytics.record("billing.opened")
    expect(store.get("queue")).toHaveLength(1)
    await analytics.setEnabled(false)
    expect(store.get("queue")).toBeUndefined()
  })
})
