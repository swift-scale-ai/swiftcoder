import { describe, expect, test } from "bun:test"
import {
  copySessionTranscript,
  exportSessionTranscript,
  requestSessionCompaction,
} from "../../../src/routes/session/actions"

describe("requestSessionCompaction", () => {
  test("waits for the summarize request", async () => {
    let completed = false
    await requestSessionCompaction({ summarize: async () => ((completed = true), {}) })
    expect(completed).toBe(true)
  })

  test("rejects an API error", async () => {
    await expect(requestSessionCompaction({ summarize: async () => ({ error: new Error("denied") }) })).rejects.toThrow(
      "denied",
    )
  })
})

describe("copySessionTranscript", () => {
  test("writes the complete transcript", async () => {
    let copied = ""
    await copySessionTranscript({ transcript: "complete", write: async (text) => void (copied = text) })
    expect(copied).toBe("complete")
  })

  test("reports unavailable clipboards", async () => {
    await expect(copySessionTranscript({ transcript: "complete" })).rejects.toThrow("Clipboard is not available")
  })
})

describe("exportSessionTranscript", () => {
  test("opens an unsaved transcript in the editor", async () => {
    let opened = ""
    const result = await exportSessionTranscript({
      transcript: "draft",
      openWithoutSaving: true,
      write: async () => {},
      openEditor: async (content) => ((opened = content), undefined),
    })
    expect(opened).toBe("draft")
    expect(result.kind).toBe("opened")
  })

  test("requires an editor for unsaved exports", async () => {
    await expect(
      exportSessionTranscript({ transcript: "draft", openWithoutSaving: true, write: async () => {} }),
    ).rejects.toThrow("No external editor configured")
  })

  test("saves and persists editor changes", async () => {
    const writes: [string, string][] = []
    const result = await exportSessionTranscript({
      transcript: "draft",
      openWithoutSaving: false,
      filepath: "/tmp/session.md",
      write: async (file, content) => void writes.push([file, content]),
      openEditor: async () => "edited",
    })
    expect(writes).toEqual([
      ["/tmp/session.md", "draft"],
      ["/tmp/session.md", "edited"],
    ])
    expect(result).toEqual({ kind: "saved", filepath: "/tmp/session.md" })
  })

  test("requires a path for saved exports", async () => {
    await expect(
      exportSessionTranscript({ transcript: "draft", openWithoutSaving: false, write: async () => {} }),
    ).rejects.toThrow("Export path is required")
  })
})
