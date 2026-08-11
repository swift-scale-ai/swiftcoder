import { describe, expect, test } from "bun:test"
import { initialWindowHeight, visibleWindowBounds } from "./window-state"

const primary = { x: 0, y: 0, width: 1512, height: 900 }

describe("visible window bounds", () => {
  test("uses the full available screen height for a new window", () => {
    expect(initialWindowHeight(900)).toBe(900)
    expect(initialWindowHeight(1600)).toBe(1600)
  })

  test("does not exceed the available height on a small screen", () => {
    expect(initialWindowHeight(650)).toBe(650)
    expect(initialWindowHeight(500)).toBe(500)
  })

  test("uses the adaptive height when no saved height exists", () => {
    expect(visibleWindowBounds({}, primary, [primary]).height).toBe(900)
  })

  test("keeps a visible saved position", () => {
    expect(visibleWindowBounds({ x: 40, y: 50, width: 1200, height: 700 }, primary, [primary])).toEqual({
      x: 40,
      y: 50,
      width: 1200,
      height: 700,
    })
  })

  test("restores size against the display containing the saved window", () => {
    const external = { x: -3840, y: -262, width: 3840, height: 1600 }
    expect(
      visibleWindowBounds({ x: -2857, y: -216, width: 1542, height: 1554 }, { x: 0, y: 0, width: 1512, height: 913 }, [
        { x: 0, y: 0, width: 1512, height: 913 },
        external,
      ]),
    ).toEqual({ x: -2857, y: -216, width: 1542, height: 1554 })
  })

  test("centers a window restored from a disconnected display", () => {
    expect(visibleWindowBounds({ x: -3192, y: -226, width: 1946, height: 1488 }, primary, [primary])).toEqual({
      x: 0,
      y: 0,
      width: 1512,
      height: 900,
    })
  })
})
