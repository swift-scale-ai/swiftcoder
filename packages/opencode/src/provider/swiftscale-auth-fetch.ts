import * as MacOSKeychain from "../auth/macos-keychain"

type OAuthAuth = { type?: string; access?: string }
type Fetcher = (resource: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const refreshFailure = (code: "token_refresh_failed" | "token_invalid_after_refresh") =>
  Response.json(
    { error: { code, message: "SwiftScale OAuth refresh failed" } },
    { status: 401, headers: { "content-type": "application/json" } },
  )

export function createSwiftScaleAuthenticatedFetch(input: {
  initialAccessToken: string
  oauth: boolean
  fetch?: Fetcher
  readAuth?: (options?: { forceRefresh?: boolean }) => Promise<unknown | undefined>
}) {
  const fetcher = input.fetch ?? fetch
  const readAuth = input.readAuth ?? MacOSKeychain.read

  const accessToken = async (forceRefresh = false) => {
    if (!input.oauth || (!input.readAuth && !MacOSKeychain.enabled())) return input.initialAccessToken
    const auth = (await readAuth({ forceRefresh })) as OAuthAuth | undefined
    return auth?.type === "oauth" && typeof auth.access === "string" ? auth.access : undefined
  }

  return async (resource: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(resource, init)
    const send = async (token: string) => {
      const headers = new Headers(request.headers)
      headers.set("authorization", `Bearer ${token}`)
      return fetcher(new Request(request.clone(), { headers }))
    }

    const current = (await accessToken().catch(() => undefined)) ?? input.initialAccessToken
    const response = await send(current)
    if (!input.oauth || (response.status !== 401 && response.status !== 403)) return response

    try {
      const refreshed = await accessToken(true)
      if (!refreshed) throw new Error("SwiftScale OAuth refresh returned no access token")
      const retried = await send(refreshed)
      if (retried.status === 401) return refreshFailure("token_invalid_after_refresh")
      return retried
    } catch {
      return refreshFailure("token_refresh_failed")
    }
  }
}
