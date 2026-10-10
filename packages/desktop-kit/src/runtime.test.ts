import assert from "node:assert/strict"
import test from "node:test"
import { defineDesktopProduct } from "./product.ts"
import { createDeferredRestartCoordinator, createDesktopRuntime } from "./runtime.ts"

const product = defineDesktopProduct({
  id: "sample",
  name: "Sample Desktop",
  shortName: "Sample",
  protocol: "sampledesk",
  storageNamespace: "sample-desktop",
  renderer: { scheme: "sample-app", host: "renderer" },
  channels: {
    dev: { appId: "com.example.sample.dev", name: "Sample Dev", updatePath: "/releases/dev" },
    beta: { appId: "com.example.sample.beta", name: "Sample Beta", updatePath: "/releases/beta" },
    prod: { appId: "com.example.sample", name: "Sample", updatePath: "/releases/prod" },
  },
  window: { defaultWidth: 1280, minimumWidth: 900, minimumHeight: 600, fillAvailableHeight: true },
})

test("credential changes restart only the runtime", async () => {
  const starts: number[] = []
  const stops: number[] = []
  const runtime = createDesktopRuntime({
    product,
    credential: async () => "credential",
    start: async ({ generation, credential }) => {
      assert.equal(credential, "credential")
      starts.push(generation)
      return {
        connection: { url: `http://127.0.0.1:${4000 + generation}` },
        stop: async () => {
          stops.push(generation)
        },
      }
    },
  })

  await runtime.start()
  await runtime.restart("login")
  assert.deepEqual(starts, [1, 2])
  assert.deepEqual(stops, [1])
  assert.equal(runtime.status().state, "ready")
})

test("restart requests made before runtime initialization are flushed", async () => {
  const reasons: string[] = []
  const coordinator = createDeferredRestartCoordinator<string>()
  coordinator.request("login")
  assert.equal(coordinator.pending(), "login")
  coordinator.bind(async (reason) => {
    reasons.push(reason)
  })
  await coordinator.settled()
  assert.deepEqual(reasons, ["login"])
})
