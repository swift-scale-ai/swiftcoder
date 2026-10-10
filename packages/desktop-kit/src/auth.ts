import { createHash, randomBytes } from "node:crypto"

export type SecureCredentialStore = {
  get(): Promise<string | undefined>
  set(value: string): Promise<void>
  remove(): Promise<void>
}

export type OAuthAccount = {
  id: string
  email: string
  name?: string
}

export type OAuthCredentialEnvelope<A extends OAuthAccount = OAuthAccount> = {
  version: 1
  auth: {
    type: "oauth"
    access: string
    refresh: string
    expires: number
  }
  account: A
}

export type OAuthStatus<A extends OAuthAccount = OAuthAccount> =
  | { state: "signed_out" }
  | { state: "authorizing" }
  | { state: "signed_in"; account: A; expiresAt: number }
  | { state: "error"; message: string }

export type OAuthController<A extends OAuthAccount = OAuthAccount> = {
  status(): Promise<OAuthStatus<A>>
  login(): Promise<OAuthStatus<A>>
  logout(): Promise<OAuthStatus<A>>
  handleDeepLinks(urls: string[]): Promise<boolean>
  credential(): Promise<string | undefined>
}

type PendingAuthorization = { verifier: string; challenge: string; state: string }

export function createPKCE(): PendingAuthorization {
  const verifier = randomBytes(48).toString("base64url")
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    state: randomBytes(24).toString("base64url"),
  }
}

export function createOAuthController<A extends OAuthAccount>(options: {
  store: SecureCredentialStore
  clientID: string
  redirectURL: string
  authorizationURL: string
  tokenURL: string
  revokeURL?: string
  scope: string
  parseAccount(value: unknown): A
  fetch?: typeof fetch
  openExternal(url: string): Promise<void>
  now?: () => number
  onChanged?(status: OAuthStatus<A>): void
  onCredentialChanged?(reason: "login" | "logout"): void
}): OAuthController<A> {
  const fetcher = options.fetch ?? fetch
  const now = options.now ?? Date.now
  let pending: PendingAuthorization | undefined
  let lastError: string | undefined

  const read = async () => {
    const raw = await options.store.get()
    if (!raw) return
    const value = JSON.parse(raw) as OAuthCredentialEnvelope<A>
    if (value.version !== 1 || value.auth?.type !== "oauth" || !value.account?.email) {
      throw new Error("Stored OAuth credentials are invalid")
    }
    return value
  }

  const tokenRequest = async (body: URLSearchParams, fallback?: OAuthCredentialEnvelope<A>) => {
    const response = await fetcher(options.tokenURL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error(`OAuth request failed (${response.status})`)
    const value = (await response.json()) as Record<string, unknown>
    if (typeof value.access_token !== "string" || typeof value.expires_in !== "number") {
      throw new Error("OAuth server returned an invalid token response")
    }
    const refresh =
      typeof value.refresh_token === "string" ? value.refresh_token : fallback?.auth.refresh
    if (!refresh) throw new Error("OAuth server did not return a refresh token")
    const account = value.account === undefined && fallback ? fallback.account : options.parseAccount(value.account)
    return { value, refresh, account }
  }

  const envelope = (token: {
    value: Record<string, unknown>
    refresh: string
    account: A
  }): OAuthCredentialEnvelope<A> => ({
    version: 1,
    auth: {
      type: "oauth",
      access: token.value.access_token as string,
      refresh: token.refresh,
      expires: now() + (token.value.expires_in as number) * 1000,
    },
    account: token.account,
  })

  const fresh = async (saved: OAuthCredentialEnvelope<A>) => {
    if (saved.auth.expires > now() + 60_000) return saved
    const token = await tokenRequest(
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: options.clientID,
        refresh_token: saved.auth.refresh,
      }),
      saved,
    )
    const updated = envelope(token)
    await options.store.set(JSON.stringify(updated))
    return updated
  }

  const status = async (): Promise<OAuthStatus<A>> => {
    if (lastError) return { state: "error", message: lastError }
    if (pending) return { state: "authorizing" }
    const value = await read()
    const saved = value ? await fresh(value) : undefined
    if (!saved) return { state: "signed_out" }
    return { state: "signed_in", account: saved.account, expiresAt: saved.auth.expires }
  }

  const publish = async () => {
    const value = await status()
    options.onChanged?.(value)
    return value
  }

  const callback = (value: string) => {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      return
    }
    const expected = new URL(options.redirectURL)
    if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname) return
    return url
  }

  return {
    status,
    async login() {
      lastError = undefined
      pending = createPKCE()
      const url = new URL(options.authorizationURL)
      url.searchParams.set("client_id", options.clientID)
      url.searchParams.set("redirect_uri", options.redirectURL)
      url.searchParams.set("response_type", "code")
      url.searchParams.set("scope", options.scope)
      url.searchParams.set("state", pending.state)
      url.searchParams.set("code_challenge", pending.challenge)
      url.searchParams.set("code_challenge_method", "S256")
      await options.openExternal(url.toString())
      return publish()
    },
    async logout() {
      const saved = await read()
      pending = undefined
      lastError = undefined
      if (saved && options.revokeURL) {
        try {
          await fetcher(options.revokeURL, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: saved.auth.refresh }),
            signal: AbortSignal.timeout(15_000),
          })
        } finally {
          await options.store.remove()
        }
      } else {
        await options.store.remove()
      }
      const value = await publish()
      if (saved) options.onCredentialChanged?.("logout")
      return value
    },
    async handleDeepLinks(urls) {
      const url = urls.map(callback).find(Boolean)
      if (!url) return false
      const authorization = pending
      pending = undefined
      let changed = false
      try {
        if (!authorization || url.searchParams.get("state") !== authorization.state) {
          throw new Error("OAuth login state did not match")
        }
        const error = url.searchParams.get("error")
        if (error) throw new Error(url.searchParams.get("error_description") ?? error)
        const code = url.searchParams.get("code")
        if (!code) throw new Error("OAuth callback did not include a code")
        const token = await tokenRequest(
          new URLSearchParams({
            grant_type: "authorization_code",
            client_id: options.clientID,
            code,
            code_verifier: authorization.verifier,
            redirect_uri: options.redirectURL,
          }),
        )
        await options.store.set(JSON.stringify(envelope(token)))
        lastError = undefined
        changed = true
      } catch (error) {
        lastError = error instanceof Error ? error.message : "OAuth login failed"
      }
      await publish()
      if (changed) options.onCredentialChanged?.("login")
      return true
    },
    async credential() {
      const value = await read()
      const saved = value ? await fresh(value) : undefined
      if (!saved || saved.auth.expires <= now()) return
      return JSON.stringify({ oauth: saved.auth })
    },
  }
}
