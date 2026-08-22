import { describe, expect, test } from "bun:test"
import { createDebugEntries } from "../../src/component/dialog-debug"

describe("createDebugEntries", () => {
  test("includes session and model details", () => {
    expect(
      createDebugEntries({
        version: "1.2.3",
        channel: "stable",
        date: "2026-08-22T00:00:00.000Z",
        os: "macOS",
        terminal: "Terminal.app",
        sessionID: "ses_123",
        model: { providerID: "swiftcoder", modelID: "swift-pro" },
      }),
    ).toEqual([
      { label: "Version", value: "1.2.3 (stable)" },
      { label: "Date", value: "2026-08-22T00:00:00.000Z" },
      { label: "OS", value: "macOS" },
      { label: "Terminal", value: "Terminal.app" },
      { label: "Session ID", value: "ses_123" },
      { label: "Model", value: "swiftcoder/swift-pro" },
    ])
  })

  test("uses n/a when session and model are unavailable", () => {
    const entries = createDebugEntries({
      version: "1.2.3",
      channel: "dev",
      date: "now",
      os: "Linux",
      terminal: "unknown",
    })
    expect(entries.at(-2)?.value).toBe("n/a")
    expect(entries.at(-1)?.value).toBe("n/a")
  })
})
