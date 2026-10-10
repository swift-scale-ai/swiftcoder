import { describe, expect, test } from "bun:test"
import { retryMessageKey } from "./session-retry"

describe("retryMessageKey", () => {
  test.each(["rate limit exceeded", "rate_limit_exceeded", "Too Many Requests", "HTTP 429", "请求过于频繁"])(
    "maps rate-limit errors to friendly copy: %s",
    (message) => {
      expect(retryMessageKey(message)).toBe("ui.sessionTurn.retry.rateLimited")
    },
  )

  test("leaves unrelated retry errors unchanged", () => {
    expect(retryMessageKey("control plane is temporarily unavailable")).toBeUndefined()
  })
})
