import { describe, expect, test } from "bun:test"
import { swiftScaleErrorMessage } from "./error"

describe("SwiftScale provider errors", () => {
  test("maps authentication, entitlement, rate limit, and availability errors", () => {
    expect(swiftScaleErrorMessage({ error: { code: "token_expired" }, request_id: "req_1" }, 401)).toBe(
      "Your SwiftScale session has expired. Sign in again. Request ID: req_1.",
    )
    expect(swiftScaleErrorMessage({ error: { code: "model_not_entitled" } }, 403)).toContain("not included")
    expect(swiftScaleErrorMessage({ error: { code: "rate_limit_exceeded" } }, 429)).toContain("rate limit")
    expect(swiftScaleErrorMessage({ error: { code: "service_unavailable" } }, 503)).toContain("temporarily unavailable")
    expect(swiftScaleErrorMessage({ error: { code: "token_refresh_failed" } }, 401)).toContain("could not be refreshed")
    expect(swiftScaleErrorMessage({ error: { code: "fair_use_limited" } }, 429)).toContain("fair-use")
    expect(swiftScaleErrorMessage({ error: { code: "budget_exhausted" } }, 403)).toContain("budget")
    expect(swiftScaleErrorMessage({ error: { code: "service_degraded" }, request_id: "req_2" }, 503)).toContain(
      "Request ID: req_2",
    )
    expect(swiftScaleErrorMessage({ error: "invalid or missing API key" }, 401)).toBe(
      "Your SwiftScale session is not valid. Sign in again.",
    )
  })
})
