import { describe, expect, test } from "bun:test"
import { settingsConnectedProviders } from "./settings-provider-connection"

const provider = (id: string, paid = false): { id: string; models: Record<string, { cost?: { input?: number } }> } => ({
  id,
  models: paid ? { model: { cost: { input: 1 } } } : {},
})

describe("settings provider connection state", () => {
  test("shows a signed-in SwiftScale account as connected", () => {
    const swiftScale = provider("swiftcoder")
    expect(
      settingsConnectedProviders({
        connected: [],
        all: new Map([[swiftScale.id, swiftScale]]),
        swiftScaleAccountSignedIn: true,
      }),
    ).toEqual([swiftScale])
  })

  test("does not treat the public SwiftScale catalog as connected", () => {
    const swiftScale = provider("swiftcoder")
    expect(
      settingsConnectedProviders({
        connected: [swiftScale],
        all: new Map([[swiftScale.id, swiftScale]]),
        swiftScaleAccountSignedIn: false,
      }),
    ).toEqual([])
  })

  test("does not duplicate an existing SwiftScale connection", () => {
    const swiftScale = provider("swiftcoder", true)
    expect(
      settingsConnectedProviders({
        connected: [swiftScale],
        all: new Map([[swiftScale.id, swiftScale]]),
        swiftScaleAccountSignedIn: true,
      }),
    ).toEqual([swiftScale])
  })
})
