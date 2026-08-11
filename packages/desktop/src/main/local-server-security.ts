const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"])

export function parseLoopbackServerUrl(value: string) {
  if (!URL.canParse(value)) return
  const url = new URL(value)
  if (url.protocol !== "http:") return
  if (!loopbackHosts.has(url.hostname.toLowerCase())) return
  if (!url.port) return
  return url.href.replace(/\/$/, "")
}
