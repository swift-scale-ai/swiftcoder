import { describe, expect, test } from "bun:test"
import { agentOptions } from "../../src/component/dialog-agent"

describe("agentOptions", () => {
  test("builds native and custom agent options", () => {
    expect(
      agentOptions([
        { name: "build", native: true, description: "ignored" },
        { name: "review", native: false, description: "Reviews changes" },
      ]),
    ).toEqual([
      { value: "build", title: "build", description: "native" },
      { value: "review", title: "review", description: "Reviews changes" },
    ])
  })
})
