import { describe, expect, test } from "bun:test"
import { isSensitiveLogKey, redactLogText } from "./logging"

describe("log redaction", () => {
  test("redacts credentials and user content fields", () => {
    for (const key of ["headers.authorization", "access_token", "refresh_token", "request.prompt", "tool.input", "message.content", "answers"]) {
      expect(isSensitiveLogKey(key)).toBe(true)
    }
    expect(redactLogText("Authorization: Bearer token_1234567890123456")).toBe(
      "Authorization: Bearer [REDACTED]",
    )
    expect(redactLogText("key=sk_1234567890123456")).not.toContain("1234567890123456")
  })
})

