import type { PermissionRequest } from "@swiftscale/sdk/v2/client"

export type ApprovalMode = "ask" | "agent" | "full"

const safeShellPatterns = [
  /^(pwd|ls)(\s|$)/,
  /^(rg|grep|find|fd)(\s|$)/,
  /^(cat|head|tail|wc)(\s|$)/,
  /^sed\s+-n(\s|$)/,
  /^git\s+(status|diff|log|show|branch|rev-parse)(\s|$)/,
]

function safeShell(request: PermissionRequest) {
  return request.patterns.length > 0 && request.patterns.every((pattern) => safeShellPatterns.some((rule) => rule.test(pattern.trim())))
}

export function approvalModeAutoRespond(mode: ApprovalMode, request: PermissionRequest) {
  if (mode === "full") return true
  if (mode === "ask") return false
  if (request.permission === "external_directory" || request.permission === "doom_loop") return false
  if (request.permission === "bash") return safeShell(request)
  return true
}
