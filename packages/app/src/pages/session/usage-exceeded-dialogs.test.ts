import { expect, test } from "bun:test"
import type { SessionStatus } from "@opencode-ai/sdk/v2"
import { goUpsellKeys } from "./usage-exceeded-dialogs"

const retry = (reason: "free_tier_limit" | "account_rate_limit", provider = "swiftcoder") =>
  ({
    type: "retry",
    attempt: 1,
    message: "Try again later",
    next: Date.now() + 1_000,
    action: { reason, provider, title: "Limit reached", message: "Limit reached", label: "Manage plan" },
  }) as SessionStatus

test("routes SwiftScale quota and rate-limit actions to separate dialogs", () => {
  expect(goUpsellKeys(retry("free_tier_limit"))).toEqual({
    lastSeenAt: "go_upsell_last_seen_at",
    dontShow: "go_upsell_dont_show",
  })
  expect(goUpsellKeys(retry("account_rate_limit"))).toEqual({
    lastSeenAt: "go_upsell_account_rate_limit_last_seen_at",
    dontShow: "go_upsell_account_rate_limit_dont_show",
  })
})

test("does not show SwiftScale entitlement dialogs for unrelated providers", () => {
  expect(goUpsellKeys(retry("account_rate_limit", "other"))).toBeUndefined()
})
