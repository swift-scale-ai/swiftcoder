import { describe, expect, test } from "bun:test"
import { isTrustedRendererURL, rendererContentSecurityPolicy } from "./renderer-security"

describe("production renderer CSP", () => {
  test("only permits the local Agent Server and SwiftScale API connections", () => {
    expect(rendererContentSecurityPolicy).toContain("connect-src 'self' http://127.0.0.1:*")
    expect(rendererContentSecurityPolicy).toContain("https://api.swift-scale.com")
    expect(rendererContentSecurityPolicy).not.toContain("connect-src *")
  })

  test("blocks embedded documents, plugins, and base URL rewriting", () => {
    expect(rendererContentSecurityPolicy).toContain("object-src 'none'")
    expect(rendererContentSecurityPolicy).toContain("frame-src 'none'")
    expect(rendererContentSecurityPolicy).toContain("base-uri 'none'")
  })
})

describe("trusted renderer URL policy", () => {
  test("accepts the production app and configured development origin", () => {
    expect(isTrustedRendererURL("swiftcoder-app://renderer/index.html", undefined)).toBe(true)
    expect(isTrustedRendererURL("http://127.0.0.1:5173/session", "http://127.0.0.1:5173")).toBe(true)
  })

  test("rejects remote pages, sibling hosts, and malformed URLs", () => {
    expect(isTrustedRendererURL("https://swift-scale.com", undefined)).toBe(false)
    expect(isTrustedRendererURL("swiftcoder-app://attacker/index.html", undefined)).toBe(false)
    expect(isTrustedRendererURL("swiftcoder-app://user@renderer/index.html", undefined)).toBe(false)
    expect(isTrustedRendererURL("not a url", undefined)).toBe(false)
  })
})
