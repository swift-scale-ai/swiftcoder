import { afterEach, expect, test } from "bun:test"
import { normalizePromptContent, openEditor, resolveEditorCommand } from "../src/editor"

const editor = process.env.EDITOR
const visual = process.env.VISUAL

afterEach(() => {
  process.env.EDITOR = editor
  process.env.VISUAL = visual
})

test("resolves VISUAL before EDITOR and ignores blank values", () => {
  expect(resolveEditorCommand({ VISUAL: " code --wait ", EDITOR: "vim" })).toBe("code --wait")
  expect(resolveEditorCommand({ VISUAL: "   ", EDITOR: " vim " })).toBe("vim")
  expect(resolveEditorCommand({ VISUAL: "", EDITOR: "" })).toBeUndefined()
})

test("rejects when no external editor is configured", async () => {
  delete process.env.VISUAL
  delete process.env.EDITOR
  const renderer = {
    suspend() {},
    resume() {},
    requestRender() {},
    currentRenderBuffer: { clear() {} },
  }

  await expect(openEditor({ value: "original", renderer: renderer as never })).rejects.toThrow(
    "No external editor configured",
  )
})

test("rejects when the external editor cannot start", async () => {
  delete process.env.VISUAL
  process.env.EDITOR = "opencode-editor-that-does-not-exist"
  const renderer = {
    suspend() {},
    resume() {},
    requestRender() {},
    currentRenderBuffer: { clear() {} },
  }

  await expect(openEditor({ value: "original", renderer: renderer as never })).rejects.toThrow()
})

test("normalizes a single trailing editor newline for one-line prompts", () => {
  expect(normalizePromptContent("hello\n")).toBe("hello")
  expect(normalizePromptContent("hello\r\n")).toBe("hello")
})

test("preserves multiline prompts that end with a newline", () => {
  expect(normalizePromptContent("hello\nworld\n")).toBe("hello\nworld\n")
})
