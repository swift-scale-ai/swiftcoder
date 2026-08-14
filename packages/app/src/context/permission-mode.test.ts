import { describe, expect, test } from "bun:test"
import type { PermissionRequest } from "@swiftscale/sdk/v2/client"
import { approvalModeAutoRespond } from "./permission-mode"

const request = (permission: string, patterns: string[] = ["*"]) =>
  ({ permission, patterns }) as PermissionRequest

describe("approvalModeAutoRespond", () => {
  test("asks for every prompted action in ask mode", () => {
    expect(approvalModeAutoRespond("ask", request("edit"))).toBe(false)
  })

  test("allows project edits and read-only commands in agent mode", () => {
    expect(approvalModeAutoRespond("agent", request("edit"))).toBe(true)
    expect(approvalModeAutoRespond("agent", request("bash", ["git diff --stat"]))).toBe(true)
  })

  test("keeps dangerous commands and external directories gated in agent mode", () => {
    expect(approvalModeAutoRespond("agent", request("bash", ["rm -rf build"]))).toBe(false)
    expect(approvalModeAutoRespond("agent", request("external_directory", ["/tmp/private/*"]))).toBe(false)
  })

  test("allows all prompted actions in full mode", () => {
    expect(approvalModeAutoRespond("full", request("bash", ["rm -rf build"]))).toBe(true)
    expect(approvalModeAutoRespond("full", request("external_directory"))).toBe(true)
  })
})
