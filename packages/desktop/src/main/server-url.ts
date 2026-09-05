export function normalizeDefaultServerUrl(value: string) {
  const raw = value.trim()
  if (!raw || !URL.canParse(raw)) throw new Error("Invalid default server URL")

  const url = new URL(raw)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Default server URL must use HTTP or HTTPS")
  }
  if (url.username || url.password) throw new Error("Default server URL must not contain credentials")
  if (url.hash || url.search) throw new Error("Default server URL must not contain query parameters or a fragment")

  url.pathname = url.pathname.replace(/\/+$/, "") || "/"
  return url.toString().replace(/\/$/, "")
}
