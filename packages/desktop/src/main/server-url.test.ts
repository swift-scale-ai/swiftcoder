import { expect, test } from "bun:test"
import { normalizeDefaultServerUrl } from "./server-url"

test("normalizes supported default server URLs", () => {
  expect(normalizeDefaultServerUrl(" http://127.0.0.1:4096/ ")).toBe("http://127.0.0.1:4096")
  expect(normalizeDefaultServerUrl("https://coder.example.com/api/")).toBe("https://coder.example.com/api")
})

test("rejects unsafe or ambiguous default server URLs", () => {
  for (const value of [
    "",
    "swiftcoder-app://renderer",
    "file:///tmp/server",
    "https://user:secret@coder.example.com",
    "https://coder.example.com/?token=secret",
    "https://coder.example.com/#fragment",
  ]) {
    expect(() => normalizeDefaultServerUrl(value)).toThrow()
  }
})
