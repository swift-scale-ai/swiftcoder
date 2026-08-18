import assert from "node:assert/strict"
import test from "node:test"
import { initialWindowHeight, visibleWindowBounds } from "./window-state.ts"

test("new windows fill the available screen height", () => {
  assert.equal(initialWindowHeight(982), 982)
  assert.deepEqual(visibleWindowBounds({}, { x: 0, y: 25, width: 1512, height: 957 }, [{ x: 0, y: 25, width: 1512, height: 957 }]), {
    x: 0,
    y: 25,
    width: 1280,
    height: 957,
  })
})

test("restored windows are clamped to a visible display", () => {
  const bounds = visibleWindowBounds(
    { x: 4000, y: 4000, width: 1600, height: 1200 },
    { x: 0, y: 0, width: 1440, height: 900 },
    [{ x: 0, y: 0, width: 1440, height: 900 }],
  )
  assert.deepEqual(bounds, { x: 0, y: 0, width: 1440, height: 900 })
})
