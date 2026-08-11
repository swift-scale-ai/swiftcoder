import { describe, expect, test } from "bun:test"
import { swiftScaleAuthErrorPresentation } from "./swiftscale-auth-error-presentation"

describe("SwiftScale authentication error presentation", () => {
  test("uses signed-in account access for an API Services user", () => {
    expect(
      swiftScaleAuthErrorPresentation({
        state: "signed_in",
        account: { id: "acct_1", email: "api@example.com", plan: "api_services" },
        expiresAt: Date.now() + 60_000,
      }),
    ).toMatchObject({ kind: "retry", action: "Retry" })
  })

  test("offers a retry when a Coding Plan user has already signed in", () => {
    expect(
      swiftScaleAuthErrorPresentation({
        state: "signed_in",
        account: { id: "acct_2", email: "coding@example.com", plan: "coding" },
        expiresAt: Date.now() + 60_000,
      }),
    ).toMatchObject({ kind: "retry", action: "Retry" })
  })

  test("asks signed-out users to sign in", () => {
    expect(swiftScaleAuthErrorPresentation({ state: "signed_out" })).toMatchObject({
      kind: "sign_in",
      action: "Sign in",
    })
  })

  test("requires reconnection when automatic token refresh fails", () => {
    expect(
      swiftScaleAuthErrorPresentation(
        {
          state: "signed_in",
          account: { id: "acct_3", email: "api@example.com", plan: "api_services" },
          expiresAt: Date.now() + 60_000,
        },
        { reauthenticate: true },
      ),
    ).toMatchObject({ kind: "sign_in", action: "Reconnect" })
  })
})
