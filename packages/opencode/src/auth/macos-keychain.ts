import { execFile as execFileCallback } from "node:child_process"
import { promisify } from "node:util"

const execFile = promisify(execFileCallback)
const service = "com.swiftscale.swiftcoder.oauth"
const account = "swiftcoder"
const common = ["-a", account, "-s", service]
const defaultAuthBaseURL = "https://admin-api.swift-scale.com/v1/auth/desktop"

export const enabled = () => process.platform === "darwin" && process.env.SWIFTCODER_CLIENT === "desktop"

export const tokenEndpoint = (baseURL = process.env.SWIFTCODER_AUTH_BASE_URL ?? defaultAuthBaseURL) =>
  `${baseURL.replace(/\/$/, "")}/token`

let refreshing: Promise<unknown | undefined> | undefined

export const read = async (options: { forceRefresh?: boolean } = {}): Promise<unknown | undefined> => {
  try {
    const { stdout } = await execFile("/usr/bin/security", ["find-generic-password", ...common, "-w"])
    const envelope = JSON.parse(stdout.trim()) as {
      auth?: { type?: string; access?: string; refresh?: string; expires?: number; accountId?: string }
      account?: unknown
      version?: number
    }
    const shouldRefresh =
      envelope.auth?.type === "oauth" &&
      envelope.auth.refresh &&
      typeof envelope.auth.expires === "number" &&
      (options.forceRefresh || envelope.auth.expires <= Date.now() + 60_000)
    if (shouldRefresh) {
      refreshing ??= refresh(envelope).finally(() => {
        refreshing = undefined
      })
      return await refreshing
    }
    return envelope.auth
  } catch (error) {
    if ((error as { code?: number }).code === 44) return undefined
    throw error
  }
}

async function refresh(envelope: {
  auth?: { type?: string; access?: string; refresh?: string; expires?: number; accountId?: string }
  account?: unknown
  version?: number
}) {
  const current = envelope.auth
  if (current?.type !== "oauth" || !current.refresh) return current
  const response = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "swiftcoder-desktop",
      refresh_token: current.refresh,
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`SwiftScale token refresh failed (${response.status})`)
  const token = (await response.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    account?: unknown
  }
  if (typeof token.access_token !== "string" || typeof token.expires_in !== "number") {
    throw new Error("SwiftScale returned an invalid refresh response")
  }
  envelope.auth = {
    ...current,
    access: token.access_token,
    refresh: token.refresh_token ?? current.refresh,
    expires: Date.now() + token.expires_in * 1000,
  }
  if (token.account) envelope.account = token.account
  await execFile("/usr/bin/security", ["add-generic-password", ...common, "-w", JSON.stringify(envelope), "-U"])
  return envelope.auth
}

export const write = async (auth: unknown) => {
  let envelope: Record<string, unknown> = { version: 1 }
  try {
    const { stdout } = await execFile("/usr/bin/security", ["find-generic-password", ...common, "-w"])
    envelope = JSON.parse(stdout.trim()) as Record<string, unknown>
  } catch (error) {
    if ((error as { code?: number }).code !== 44) throw error
  }
  envelope.auth = auth
  await execFile("/usr/bin/security", ["add-generic-password", ...common, "-w", JSON.stringify(envelope), "-U"])
}

export const remove = async () => {
  try {
    await execFile("/usr/bin/security", ["delete-generic-password", ...common])
  } catch (error) {
    if ((error as { code?: number }).code !== 44) throw error
  }
}
