import { describe, expect, test } from "bun:test"
import { createSwiftScaleAuthenticatedFetch } from "./swiftscale-auth-fetch"

describe("SwiftScale authenticated fetch", () => {
  for (const status of [401, 403]) {
    test(`refreshes OAuth and retries once after ${status}`, async () => {
      const requests: string[] = []
      const refreshes: boolean[] = []
      const authenticatedFetch = createSwiftScaleAuthenticatedFetch({
        initialAccessToken: "stale",
        oauth: true,
        readAuth: async (options) => {
          refreshes.push(options?.forceRefresh === true)
          return { type: "oauth", access: options?.forceRefresh ? "fresh" : "current" }
        },
        fetch: async (resource, init) => {
          const request = new Request(resource, init)
          requests.push(request.headers.get("authorization") ?? "")
          return new Response(null, { status: requests.length === 1 ? status : 200 })
        },
      })

      const response = await authenticatedFetch("https://api.swift-scale.com/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify({ model: "swiftlite.auto" }),
      })

      expect(response.status).toBe(200)
      expect(requests).toEqual(["Bearer current", "Bearer fresh"])
      expect(refreshes).toEqual([false, true])
    })
  }

  test("does not refresh temporary service failures", async () => {
    let reads = 0
    const authenticatedFetch = createSwiftScaleAuthenticatedFetch({
      initialAccessToken: "initial",
      oauth: true,
      readAuth: async () => {
        reads++
        return { type: "oauth", access: "current" }
      },
      fetch: async () => new Response(null, { status: 503 }),
    })

    expect((await authenticatedFetch("https://api.swift-scale.com/v1/chat/completions")).status).toBe(503)
    expect(reads).toBe(1)
  })

  test("returns an authentication failure when refresh fails", async () => {
    let calls = 0
    const authenticatedFetch = createSwiftScaleAuthenticatedFetch({
      initialAccessToken: "initial",
      oauth: true,
      readAuth: async (options) => {
        if (options?.forceRefresh) throw new Error("refresh unavailable")
        return { type: "oauth", access: "current" }
      },
      fetch: async () => {
        calls++
        return new Response(null, { status: 401 })
      },
    })

    const response = await authenticatedFetch("https://api.swift-scale.com/v1/chat/completions")
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: "token_refresh_failed" } })
    expect(calls).toBe(1)
  })

  test("requires reauthentication when the refreshed token is still rejected", async () => {
    const authenticatedFetch = createSwiftScaleAuthenticatedFetch({
      initialAccessToken: "initial",
      oauth: true,
      readAuth: async (options) => ({ type: "oauth", access: options?.forceRefresh ? "fresh" : "current" }),
      fetch: async () => new Response(null, { status: 401 }),
    })

    const response = await authenticatedFetch("https://api.swift-scale.com/v1/chat/completions")
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: "token_invalid_after_refresh" } })
  })
})
