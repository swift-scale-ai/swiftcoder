import assert from "node:assert/strict"
import test from "node:test"
import { createDeepLinkRouter } from "./deep-link.ts"

test("routes only the product protocol and lets auth consume callbacks", async () => {
  const router = createDeepLinkRouter("sampledesk")
  const delivered: string[][] = []
  router.registerHandler((urls) => urls.some((url) => new URL(url).host === "auth"))
  router.setSink((urls) => delivered.push(urls))

  await router.receive(["otherdesk://auth/callback", "sampledesk://auth/callback"])
  await router.receive(["sampledesk://task/task_1"])

  assert.deepEqual(delivered, [["sampledesk://task/task_1"]])
})

test("queues links until the renderer is ready", async () => {
  const router = createDeepLinkRouter("sampledesk")
  await router.receive(["sampledesk://task/task_1"])
  assert.deepEqual(router.consumePending(), ["sampledesk://task/task_1"])
})
