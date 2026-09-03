import {
  SWIFTSCALE_CALLBACK_URL,
  SWIFTSCALE_KEYCHAIN_ACCOUNT,
  SWIFTSCALE_KEYCHAIN_SERVICE,
  accountEndpoints,
  authEndpoints,
  createAuthorizationURL,
  createPKCE,
  credentialEnvelope,
  parseAuthCallback,
  parseAccountProfileResponse,
  parseEntitlementsResponse,
  parseTokenResponse,
  type SwiftScaleAuthStatus,
  type SwiftScaleCredentialEnvelope,
  type SwiftScaleEntitlements,
} from "./swiftscale-auth-contract"
import { createMacOSKeychainStore, type SecureCredentialStore } from "./keychain"

type PendingAuthorization = ReturnType<typeof createPKCE>

export type SwiftScaleAuthController = {
  status: () => Promise<SwiftScaleAuthStatus>
  login: () => Promise<SwiftScaleAuthStatus>
  logout: () => Promise<SwiftScaleAuthStatus>
  entitlements: (refresh?: boolean) => Promise<SwiftScaleEntitlements>
  handleDeepLinks: (urls: string[]) => Promise<boolean>
  credentialForSidecar: () => Promise<string | undefined>
}

const postForm = async (url: string, form: URLSearchParams, fetcher: typeof fetch) => {
  const response = await fetcher(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: form,
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    const requestID = response.headers.get("x-request-id") ?? response.headers.get("x-swiftscale-request-id")
    throw new Error(`SwiftScale authentication failed (${response.status})${requestID ? `, request ${requestID}` : ""}`)
  }
  if (response.status === 204) return undefined
  return response.json()
}

export const createSwiftScaleAuthController = (input?: {
  store?: SecureCredentialStore
  fetch?: typeof fetch
  openExternal?: (url: string) => Promise<void>
  baseURL?: string
  apiBaseURL?: string
  now?: () => number
  onChanged?: (status: SwiftScaleAuthStatus) => void
  onCredentialChanged?: (reason: "login" | "logout") => void
}): SwiftScaleAuthController => {
  const store =
    input?.store ??
    createMacOSKeychainStore({ service: SWIFTSCALE_KEYCHAIN_SERVICE, account: SWIFTSCALE_KEYCHAIN_ACCOUNT })
  const fetcher = input?.fetch ?? fetch
  const openExternal =
    input?.openExternal ??
    (async () => {
      throw new Error("SwiftScale login is unavailable on this platform")
    })
  const endpoints = authEndpoints(input?.baseURL)
  const account = accountEndpoints(input?.apiBaseURL)
  const now = input?.now ?? Date.now
  let pending: PendingAuthorization | undefined
  let lastError: string | undefined
  let entitlementCache: { value: SwiftScaleEntitlements; expiresAt: number } | undefined

  const read = async () => {
    const raw = await store.get()
    if (!raw) return
    try {
      const value = JSON.parse(raw) as SwiftScaleCredentialEnvelope
      if (value.version !== 1 || value.auth?.type !== "oauth" || !value.account?.email) return
      return value
    } catch {
      throw new Error("SwiftCoder credentials in macOS Keychain are invalid")
    }
  }

  const fresh = async (saved: SwiftScaleCredentialEnvelope) => {
    if (saved.auth.expires > now() + 60_000) return saved
    const body = await postForm(
      endpoints.token,
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: "swiftcoder-desktop",
        refresh_token: saved.auth.refresh,
      }),
      fetcher,
    )
    const token = parseTokenResponse(body)
    const updated = credentialEnvelope(token, now)
    await store.set(JSON.stringify(updated))
    return updated
  }

  const status = async (): Promise<SwiftScaleAuthStatus> => {
    if (lastError) return { state: "error", message: lastError }
    if (pending) return { state: "authorizing" }
    const current = await read()
    const saved = current ? await fresh(current) : undefined
    if (!saved) return { state: "signed_out" }
    return { state: "signed_in", account: saved.account, expiresAt: saved.auth.expires }
  }

  const publish = async () => {
    const value = await status()
    input?.onChanged?.(value)
    return value
  }

  return {
    status,
    async login() {
      lastError = undefined
      pending = createPKCE()
      const url = createAuthorizationURL({ endpoint: endpoints.authorize, ...pending })
      await openExternal(url)
      return publish()
    },
    async logout() {
      const saved = await read()
      pending = undefined
      lastError = undefined
      entitlementCache = undefined
      if (saved) {
        try {
          await postForm(endpoints.revoke, new URLSearchParams({ token: saved.auth.refresh }), fetcher)
        } finally {
          await store.remove()
        }
      }
      const value = await publish()
      if (saved) input?.onCredentialChanged?.("logout")
      return value
    },
    async entitlements(refresh = false) {
      if (!refresh && entitlementCache && entitlementCache.expiresAt > now()) return entitlementCache.value
      const current = await read()
      let saved = current ? await fresh(current) : undefined
      if (!saved) throw new Error("Sign in with SwiftScale to view account entitlements")
      if (refresh) {
        try {
          const profileResponse = await fetcher(account.profile, {
            method: "GET",
            headers: { authorization: `Bearer ${saved.auth.access}`, accept: "application/json" },
            signal: AbortSignal.timeout(15_000),
          })
          if (profileResponse.ok) {
            const profile = parseAccountProfileResponse(await profileResponse.json(), saved.account)
            if (profile) {
              saved = { ...saved, account: profile }
              await store.set(JSON.stringify(saved))
            }
          }
        } catch {}
      }
      const response = await fetcher(account.entitlements, {
        method: "GET",
        headers: { authorization: `Bearer ${saved.auth.access}`, accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      })
      const requestID =
        response.headers.get("x-request-id") ?? response.headers.get("x-swiftscale-request-id") ?? undefined
      if (!response.ok) {
        throw new Error(
          `SwiftScale entitlements failed (${response.status})${requestID ? `, request ${requestID}` : ""}`,
        )
      }
      const value = parseEntitlementsResponse(await response.json(), requestID)
      entitlementCache = { value, expiresAt: now() + 60_000 }
      return value
    },
    async handleDeepLinks(urls) {
      const callback = urls.map(parseAuthCallback).find(Boolean)
      if (!callback) return false
      const current = pending
      pending = undefined
      let credentialChanged = false
      try {
        if (!current || callback.state !== current.state) throw new Error("SwiftScale login state did not match")
        if (callback.error) throw new Error(callback.errorDescription ?? callback.error)
        if (!callback.code) throw new Error("SwiftScale login callback did not include a code")
        const body = await postForm(
          endpoints.token,
          new URLSearchParams({
            grant_type: "authorization_code",
            client_id: "swiftcoder-desktop",
            code: callback.code,
            code_verifier: current.verifier,
            redirect_uri: SWIFTSCALE_CALLBACK_URL,
          }),
          fetcher,
        )
        const token = parseTokenResponse(body)
        await store.set(JSON.stringify(credentialEnvelope(token, now)))
        credentialChanged = true
        lastError = undefined
      } catch (error) {
        lastError = error instanceof Error ? error.message : "SwiftScale login failed"
      }
      await publish()
      if (credentialChanged) input?.onCredentialChanged?.("login")
      return true
    },
    async credentialForSidecar() {
      try {
        const current = await read()
        const saved = current ? await fresh(current) : undefined
        if (!saved) return undefined
        if (saved.auth.expires <= now()) return undefined
        return JSON.stringify({ swiftcoder: saved.auth })
      } catch (error) {
        // An expired or temporarily unavailable cloud session must not prevent
        // the local server from starting. Keep the credential so a successful
        // sign-in can replace it and expose the failure through account status.
        lastError = error instanceof Error ? error.message : "SwiftScale authentication failed"
        input?.onChanged?.({ state: "error", message: lastError })
        return undefined
      }
    },
  }
}
