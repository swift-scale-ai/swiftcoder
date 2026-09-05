import { expect, test } from "bun:test"
import { isIdleSessionStatus } from "./sidecar-idle"

test("treats an empty or fully idle status map as idle", () => {
  expect(isIdleSessionStatus({})).toBe(true)
  expect(isIdleSessionStatus({ session_1: { type: "idle" }, session_2: { type: "idle" } })).toBe(true)
})

test("keeps the sidecar alive for active or malformed status maps", () => {
  expect(isIdleSessionStatus({ session_1: { type: "busy" } })).toBe(false)
  expect(isIdleSessionStatus({ session_1: { type: "retry", attempt: 2 } })).toBe(false)
  expect(isIdleSessionStatus(null)).toBe(false)
  expect(isIdleSessionStatus([])).toBe(false)
})
