import assert from "node:assert/strict"
import test from "node:test"
import { createOAuthController } from "./auth.ts"

test("completes PKCE login and publishes a sidecar credential", async () => {
  let stored: string | undefined
  let opened = ""
  const changes: string[] = []
  const controller = createOAuthController({
    store: {
      get: async () => stored,
      set: async (value) => {
        stored = value
      },
      remove: async () => {
        stored = undefined
      },
    },
    clientID: "sample-desktop",
    redirectURL: "sampledesk://auth/callback",
    authorizationURL: "https://accounts.example.com/desktop/authorize/",
    tokenURL: "https://accounts.example.com/oauth/token",
    scope: "openid profile email",
    parseAccount: (value) => value as { id: string; email: string; name: string },
    openExternal: async (url) => {
      opened = url
    },
    fetch: async () =>
      Response.json({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 3600,
        account: { id: "account_1", email: "janus@example.com", name: "Janus" },
      }),
    onCredentialChanged: (reason) => changes.push(reason),
  })

  assert.equal((await controller.login()).state, "authorizing")
  const authorization = new URL(opened)
  await controller.handleDeepLinks([
    `sampledesk://auth/callback?code=code&state=${authorization.searchParams.get("state")}`,
  ])

  const status = await controller.status()
  assert.equal(status.state, "signed_in")
  assert.match((await controller.credential()) ?? "", /access/)
  assert.deepEqual(changes, ["login"])
})
