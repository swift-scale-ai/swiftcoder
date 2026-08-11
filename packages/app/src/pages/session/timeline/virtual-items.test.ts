import { expect, test } from "bun:test"
import { filterVirtualIndexes } from "./virtual-items"

test("long-session virtual windows never render indexes outside the timeline", () => {
  const count = 2_999
  const window = Array.from({ length: 121 }, (_, index) => 1_440 + index)
  expect(filterVirtualIndexes([-1, ...window, count], count)).toEqual(window)
  expect(window.length).toBeLessThan(150)
})
