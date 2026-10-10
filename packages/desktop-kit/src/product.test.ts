import assert from "node:assert/strict"
import test from "node:test"
import { defineDesktopProduct, resolveDesktopChannel } from "./product.ts"

test("defines independent desktop product channels", () => {
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

  assert.equal(product.channels.prod.appId, "com.example.sample")
  assert.equal(resolveDesktopChannel("latest"), "prod")
  assert.equal(resolveDesktopChannel("unexpected"), "dev")
})
