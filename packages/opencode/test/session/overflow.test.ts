import { expect, test } from "bun:test"
import { isOverflow, usable } from "@/session/overflow"

const model = {
  limit: { context: 32_768, input: 1_000_000, output: 32_000 },
} as any

test("effective context limit wins over a larger physical input limit", () => {
  expect(usable({ cfg: {} as any, model, outputTokenMax: 8_000 })).toBe(24_768)
})

test("automatic compaction starts before the effective limit is exceeded", () => {
  expect(
    isOverflow({
      cfg: {} as any,
      model,
      outputTokenMax: 8_000,
      tokens: { input: 24_768, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    }),
  ).toBe(true)
})
