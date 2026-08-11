export const rendererContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://swift-scale.com https://*.swift-scale.com",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:* https://api.swift-scale.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
].join("; ")

const rendererProtocol = "swiftcoder-app:"
const rendererHost = "renderer"

export function isTrustedRendererURL(value?: string, devURL = process.env.ELECTRON_RENDERER_URL) {
  if (!value || !URL.canParse(value)) return false
  const url = new URL(value)
  if (url.protocol === rendererProtocol && url.host === rendererHost && !url.username && !url.password) return true
  if (!devURL || !URL.canParse(devURL)) return false
  return url.origin === new URL(devURL).origin
}
