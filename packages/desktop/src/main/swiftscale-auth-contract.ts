import { createHash, randomBytes } from "node:crypto"

export const SWIFTSCALE_PROVIDER_ID = "swiftcoder"
export const SWIFTSCALE_KEYCHAIN_SERVICE = "com.swiftscale.swiftcoder.oauth"
export const SWIFTSCALE_KEYCHAIN_ACCOUNT = "swiftcoder"
export const SWIFTSCALE_CALLBACK_URL = "swiftcoder://auth/callback"

const DEFAULT_AUTHORIZATION_URL = "https://swift-scale.com/swiftcoder/authorize/"
const DEFAULT_AUTH_BASE_URL = "https://swift-scale.com/v1/auth/desktop"
const DEFAULT_ACCOUNT_BASE_URL = "https://swift-scale.com/v1"

export type SwiftScaleAccount = {
  id: string
  email: string
  name?: string
  plan: "coding" | "api_services"
}

export type SwiftScaleCredential = {
  type: "oauth"
  access: string
  refresh: string
  expires: number
  accountId?: string
}

export type SwiftScaleCredentialEnvelope = {
  version: 1
  auth: SwiftScaleCredential
  account: SwiftScaleAccount
}

export type SwiftScaleAuthStatus =
  | { state: "signed_out" }
  | { state: "authorizing" }
  | { state: "signed_in"; account: SwiftScaleAccount; expiresAt: number }
  | { state: "error"; message: string }

export type SwiftScaleTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  account: SwiftScaleAccount
}

export type SwiftScaleEntitlements = {
  tier: "free" | "lite" | "pro"
  product: "coding" | "api_services"
  subscription: "active" | "past_due" | "canceled"
  usage: {
    level: "available" | "limited" | "exhausted"
    resetsAt?: string
  }
  limits: {
    concurrentTasks: number
    contextTier: "standard" | "extended" | "maximum"
  }
  service: {
    status: "operational" | "degraded" | "outage"
    message?: string
  }
  products?: {
    coding: {
      enabled: boolean
      models: string[]
      tier?: "free" | "lite" | "pro"
      subscription?: "active" | "past_due" | "canceled"
    }
    apiServices: {
      enabled: boolean
      models: string[]
      billing: "payg"
      accountTier?: "developer" | "team" | "business" | "enterprise"
      concurrencyLimit?: number
    }
  }
  requestID?: string
}

type SwiftScaleProducts = NonNullable<SwiftScaleEntitlements["products"]>

export const authEndpoints = (baseURL?: string) => {
  const override = baseURL ?? process.env.SWIFTCODER_AUTH_BASE_URL
  const authorization = process.env.SWIFTCODER_AUTHORIZATION_URL?.replace(/\/$/, "")
  const base = (override ?? DEFAULT_AUTH_BASE_URL).replace(/\/$/, "")
  return {
    authorize: authorization ?? (override ? `${base}/authorize` : DEFAULT_AUTHORIZATION_URL),
    token: `${base}/token`,
    revoke: `${base}/revoke`,
  }
}

export const accountEndpoints = (baseURL = process.env.SWIFTCODER_ACCOUNT_BASE_URL ?? DEFAULT_ACCOUNT_BASE_URL) => ({
  entitlements: `${baseURL.replace(/\/$/, "")}/account/entitlements`,
  profile: `${baseURL.replace(/\/$/, "")}/auth/me`,
})

const base64URL = (value: Buffer) => value.toString("base64url")

export const createPKCE = () => {
  const verifier = base64URL(randomBytes(48))
  return {
    verifier,
    challenge: base64URL(createHash("sha256").update(verifier).digest()),
    state: base64URL(randomBytes(24)),
  }
}

export const createAuthorizationURL = (input: {
  endpoint: string
  state: string
  challenge: string
  clientID?: string
}) => {
  const url = new URL(input.endpoint)
  url.searchParams.set("client_id", input.clientID ?? "swiftcoder-desktop")
  url.searchParams.set("redirect_uri", SWIFTSCALE_CALLBACK_URL)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid profile email models:read responses:write")
  url.searchParams.set("state", input.state)
  url.searchParams.set("code_challenge", input.challenge)
  url.searchParams.set("code_challenge_method", "S256")
  return url.toString()
}

export const parseAuthCallback = (value: string) => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return
  }
  if (url.protocol !== "swiftcoder:" || url.hostname !== "auth" || url.pathname !== "/callback") return
  return {
    code: url.searchParams.get("code") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    error: url.searchParams.get("error") ?? undefined,
    errorDescription: url.searchParams.get("error_description") ?? undefined,
  }
}

export const parseTokenResponse = (value: unknown): SwiftScaleTokenResponse => {
  if (!value || typeof value !== "object") throw new Error("SwiftScale returned an invalid token response")
  const input = value as Record<string, unknown>
  const account = input.account as Record<string, unknown> | undefined
  const plan = account?.plan
  if (
    typeof input.access_token !== "string" ||
    typeof input.refresh_token !== "string" ||
    typeof input.expires_in !== "number" ||
    !account ||
    typeof account.id !== "string" ||
    typeof account.email !== "string" ||
    (plan !== "coding" && plan !== "api_services")
  ) {
    throw new Error("SwiftScale returned an invalid token response")
  }
  return {
    access_token: input.access_token,
    refresh_token: input.refresh_token,
    expires_in: input.expires_in,
    account: {
      id: account.id,
      email: account.email,
      name: typeof account.name === "string" ? account.name : undefined,
      plan,
    },
  }
}

export const parseAccountProfileResponse = (
  value: unknown,
  fallback: SwiftScaleAccount,
): SwiftScaleAccount | undefined => {
  if (!value || typeof value !== "object") return
  const input = value as Record<string, unknown>
  const user = input.user as Record<string, unknown> | undefined
  const member = input.member as Record<string, unknown> | undefined
  if (!user || typeof user.id !== "string" || typeof user.email !== "string") return
  return {
    id: user.id,
    email: user.email,
    name: typeof member?.display_name === "string" ? member.display_name : undefined,
    plan: fallback.plan,
  }
}

export const parseEntitlementsResponse = (value: unknown, requestID?: string): SwiftScaleEntitlements => {
  if (!value || typeof value !== "object") throw new Error("SwiftScale returned invalid account entitlements")
  const input = value as Record<string, unknown>
  const usage = input.usage as Record<string, unknown> | undefined
  const limits = input.limits as Record<string, unknown> | undefined
  const service = input.service as Record<string, unknown> | undefined
  const products = input.products as Record<string, unknown> | undefined
  const coding = products?.coding as Record<string, unknown> | undefined
  const apiServices = products?.api_services as Record<string, unknown> | undefined
  const validModels = (value: unknown) =>
    Array.isArray(value) && value.every((model) => typeof model === "string" && model.length > 0 && model.length <= 200)
  if (
    !["free", "lite", "pro"].includes(String(input.tier)) ||
    !["coding", "api_services"].includes(String(input.product)) ||
    !["active", "past_due", "canceled"].includes(String(input.subscription)) ||
    !usage ||
    !["available", "limited", "exhausted"].includes(String(usage.level)) ||
    (usage.resets_at !== undefined &&
      (typeof usage.resets_at !== "string" ||
        usage.resets_at.length > 64 ||
        Number.isNaN(Date.parse(usage.resets_at)))) ||
    !limits ||
    typeof limits.concurrent_tasks !== "number" ||
    !Number.isInteger(limits.concurrent_tasks) ||
    limits.concurrent_tasks < 1 ||
    limits.concurrent_tasks > 64 ||
    !["standard", "extended", "maximum"].includes(String(limits.context_tier)) ||
    !service ||
    !["operational", "degraded", "outage"].includes(String(service.status)) ||
    (service.message !== undefined && (typeof service.message !== "string" || service.message.length > 500)) ||
    (products !== undefined &&
      (!coding ||
        typeof coding.enabled !== "boolean" ||
        !validModels(coding.models) ||
        (coding.tier !== undefined && !["free", "lite", "pro"].includes(String(coding.tier))) ||
        (coding.subscription !== undefined &&
          !["active", "past_due", "canceled"].includes(String(coding.subscription))) ||
        !apiServices ||
        typeof apiServices.enabled !== "boolean" ||
        !validModels(apiServices.models) ||
        apiServices.billing !== "payg" ||
        (apiServices.concurrency_limit !== undefined &&
          (typeof apiServices.concurrency_limit !== "number" ||
            !Number.isInteger(apiServices.concurrency_limit) ||
            apiServices.concurrency_limit < 0)) ||
        (apiServices.account_tier !== undefined &&
          !["personal", "developer", "team", "business", "enterprise"].includes(String(apiServices.account_tier)))))
  ) {
    throw new Error("SwiftScale returned invalid account entitlements")
  }
  return {
    tier: input.tier as SwiftScaleEntitlements["tier"],
    product: input.product as SwiftScaleEntitlements["product"],
    subscription: input.subscription as SwiftScaleEntitlements["subscription"],
    usage: {
      level: usage.level as SwiftScaleEntitlements["usage"]["level"],
      resetsAt: usage.resets_at as string | undefined,
    },
    limits: {
      concurrentTasks: limits.concurrent_tasks,
      contextTier: limits.context_tier as SwiftScaleEntitlements["limits"]["contextTier"],
    },
    service: {
      status: service.status as SwiftScaleEntitlements["service"]["status"],
      message: service.message as string | undefined,
    },
    products: products
      ? {
          coding: {
            enabled: coding!.enabled as boolean,
            models: coding!.models as string[],
            ...(coding!.tier === undefined ? {} : { tier: coding!.tier as SwiftScaleProducts["coding"]["tier"] }),
            ...(coding!.subscription === undefined
              ? {}
              : {
                  subscription: coding!.subscription as SwiftScaleProducts["coding"]["subscription"],
                }),
          },
          apiServices: {
            enabled: apiServices!.enabled as boolean,
            models: apiServices!.models as string[],
            billing: "payg",
            ...(apiServices!.account_tier === undefined
              ? {}
              : {
                  accountTier: (apiServices!.account_tier === "personal"
                    ? "developer"
                    : apiServices!.account_tier) as SwiftScaleProducts["apiServices"]["accountTier"],
                }),
            ...(apiServices!.concurrency_limit === undefined
              ? {}
              : { concurrencyLimit: apiServices!.concurrency_limit as number }),
          },
        }
      : {
          coding: { enabled: input.product === "coding", models: input.product === "coding" ? ["swiftlite.auto"] : [] },
          apiServices: { enabled: input.product === "api_services", models: [], billing: "payg" },
        },
    requestID: requestID && /^[A-Za-z0-9._:-]{1,200}$/.test(requestID) ? requestID : undefined,
  }
}

export const credentialEnvelope = (token: SwiftScaleTokenResponse, now = Date.now): SwiftScaleCredentialEnvelope => ({
  version: 1,
  auth: {
    type: "oauth",
    access: token.access_token,
    refresh: token.refresh_token,
    expires: now() + token.expires_in * 1000,
    accountId: token.account.id,
  },
  account: token.account,
})
