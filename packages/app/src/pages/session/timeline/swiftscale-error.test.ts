import { describe, expect, test } from "bun:test"
import {
  isSwiftScaleAuthError,
  isSwiftScaleAvailabilityError,
  isSwiftScaleReauthenticationError,
} from "./swiftscale-error"

describe("SwiftScale timeline errors", () => {
  test("recognizes gateway and normalized authentication failures", () => {
    expect(isSwiftScaleAuthError("invalid or missing API key")).toBe(true)
    expect(isSwiftScaleAuthError("Your SwiftScale session has expired. Sign in again.")).toBe(true)
    expect(isSwiftScaleAuthError("Your SwiftScale session is not valid. Sign in again.")).toBe(true)
  })

  test("leaves unrelated provider errors unchanged", () => {
    expect(isSwiftScaleAuthError("SwiftScale rate limit reached. Wait briefly and retry.")).toBe(false)
  })

  test("recognizes temporary control-plane and service failures separately", () => {
    expect(isSwiftScaleAvailabilityError("control plane is temporarily unavailable")).toBe(true)
    expect(isSwiftScaleAvailabilityError("SwiftScale is temporarily unavailable. Retry shortly.")).toBe(true)
    expect(isSwiftScaleAvailabilityError("Your SwiftScale session has expired. Sign in again.")).toBe(false)
  })

  test("recognizes a failed automatic refresh as requiring a new login", () => {
    expect(isSwiftScaleReauthenticationError("Your SwiftScale session could not be refreshed. Sign in again.")).toBe(
      true,
    )
    expect(isSwiftScaleReauthenticationError("Your SwiftScale session has expired. Sign in again.")).toBe(false)
  })
})
