import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { accountStorageNamespace, accountStoragePaths, activeAccountID } from "./account-storage"

describe("account-scoped desktop storage", () => {
  test("reads the stable account id without using email or credentials", () => {
    const accountID = activeAccountID(() =>
      JSON.stringify({
        version: 1,
        auth: { type: "oauth", access: "secret", accountId: "acct_auth" },
        account: { id: "acct_primary", email: "developer@example.com" },
      }),
    )
    expect(accountID).toBe("acct_primary")
  })

  test("assigns different opaque namespaces to different accounts", () => {
    const first = accountStorageNamespace("acct_one")
    const second = accountStorageNamespace("acct_two")
    expect(first).toStartWith("account-")
    expect(second).toStartWith("account-")
    expect(first).not.toBe(second)
    expect(first).not.toContain("acct_one")
    expect(accountStorageNamespace()).toBe("anonymous")
  })

  test("keeps account data below the product root", () => {
    const paths = accountStoragePaths("/tmp/app-data", "ai.swiftscale.swiftcoder.dev", "acct_one")
    expect(paths.root).toBe(join("/tmp/app-data", "ai.swiftscale.swiftcoder.dev"))
    expect(paths.userData).toBe(join(paths.root, "accounts", paths.namespace))
  })

  test("falls back to anonymous storage for missing or invalid keychain data", () => {
    expect(activeAccountID(() => undefined)).toBeUndefined()
    expect(activeAccountID(() => "not-json")).toBeUndefined()
    expect(activeAccountID(() => JSON.stringify({ account: { id: "" } }))).toBeUndefined()
  })
})
