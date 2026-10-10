import { describe, expect, test } from "bun:test"
import { SessionV1 } from "@swiftscale/core/v1/session"
import { Effect } from "effect"
import { policy, retryable } from "./retry"

const transient = () =>
  new SessionV1.APIError({
    message: "SSE connection lost",
    statusCode: 503,
    isRetryable: true,
  }).toObject()

describe("session retry safety", () => {
  test("recognizes transient SwiftScale transport failures", () => {
    expect(retryable(transient(), "swiftcoder")?.message).toBe("SSE connection lost")
  })

  test("does not replay a request after stream output was observed", async () => {
    let attempts = 0
    let statusUpdates = 0
    const result = await Effect.runPromiseExit(
      Effect.suspend(() => {
        attempts++
        return Effect.fail(transient())
      }).pipe(
        Effect.retry(
          policy({
            provider: "swiftcoder",
            parse: (error) => error as ReturnType<typeof transient>,
            canRetry: () => false,
            set: () => Effect.sync(() => statusUpdates++),
          }),
        ),
      ),
    )
    expect(result._tag).toBe("Failure")
    expect(attempts).toBe(1)
    expect(statusUpdates).toBe(0)
  })
})
