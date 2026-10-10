import { expect, test } from "bun:test"
import { ModelV2 } from "@swiftscale/core/model"
import { shouldReuseModelForTitle } from "@/session/prompt"

test("title generation reuses SwiftLite but keeps small-model selection for other models", () => {
  expect(shouldReuseModelForTitle(ModelV2.ID.make("swiftlite.auto"))).toBe(true)
  expect(shouldReuseModelForTitle(ModelV2.ID.make("gpt-5.6-luna"))).toBe(false)
  expect(shouldReuseModelForTitle(ModelV2.ID.make("swiftpro.auto"))).toBe(false)
})
