import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { SWIFTSCALE_KEYCHAIN_ACCOUNT, SWIFTSCALE_KEYCHAIN_SERVICE } from "./swiftscale-auth-contract"

type CredentialEnvelope = {
  auth?: { accountId?: unknown }
  account?: { id?: unknown }
}

type ReadKeychain = () => string | undefined

const defaultReadKeychain: ReadKeychain = () => {
  if (process.platform !== "darwin") return
  try {
    return execFileSync(
      "/usr/bin/security",
      [
        "find-generic-password",
        "-a",
        SWIFTSCALE_KEYCHAIN_ACCOUNT,
        "-s",
        SWIFTSCALE_KEYCHAIN_SERVICE,
        "-w",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim()
  } catch {
    return
  }
}

export function activeAccountID(readKeychain: ReadKeychain = defaultReadKeychain) {
  const raw = readKeychain()
  if (!raw) return
  try {
    const envelope = JSON.parse(raw) as CredentialEnvelope
    const value = envelope.account?.id ?? envelope.auth?.accountId
    if (typeof value !== "string" || !value.trim()) return
    return value.trim()
  } catch {
    return
  }
}

export function accountStorageNamespace(accountID?: string) {
  if (!accountID) return "anonymous"
  const digest = createHash("sha256").update(accountID).digest("hex").slice(0, 24)
  return `account-${digest}`
}

export function accountStoragePaths(appData: string, appID: string, accountID?: string) {
  const root = join(appData, appID)
  const namespace = accountStorageNamespace(accountID)
  return {
    root,
    namespace,
    userData: join(root, "accounts", namespace),
  }
}
