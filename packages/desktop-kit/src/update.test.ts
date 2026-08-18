import assert from "node:assert/strict"
import test from "node:test"
import { createDesktopUpdater, type DesktopUpdateEvent } from "./update.ts"

test("desktop updater maps adapter events into a product-neutral state machine", async () => {
  let listener: ((event: DesktopUpdateEvent) => void) | undefined
  let downloads = 0
  let installs = 0
  const updater = createDesktopUpdater({
    enabled: true,
    adapter: {
      async check() {
        listener?.({ type: "checking" })
        listener?.({ type: "available", version: "0.2.0" })
      },
      async download() {
        downloads += 1
        listener?.({ type: "progress", version: "0.2.0", percent: 50 })
        listener?.({ type: "downloaded", version: "0.2.0" })
      },
      install() {
        installs += 1
      },
      subscribe(next) {
        listener = next
        return () => (listener = undefined)
      },
    },
  })

  assert.deepEqual(await updater.check(), { state: "available", version: "0.2.0" })
  assert.deepEqual(await updater.download(), { state: "ready", version: "0.2.0" })
  updater.install()
  assert.equal(downloads, 1)
  assert.equal(installs, 1)
})

test("disabled desktop updater never calls the platform adapter", async () => {
  let checks = 0
  const updater = createDesktopUpdater({
    enabled: false,
    disabledReason: "development channel",
    adapter: {
      async check() {
        checks += 1
      },
      async download() {},
      install() {},
      subscribe() {
        return () => undefined
      },
    },
  })
  assert.deepEqual(await updater.check(), { state: "disabled", reason: "development channel" })
  assert.equal(checks, 0)
})
