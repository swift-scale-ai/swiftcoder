import { APICallError } from "ai"
import { STATUS_CODES } from "http"
import { iife } from "@/util/iife"
import type { ProviderV2 } from "@opencode-ai/core/provider"
import { isContextOverflow } from "@opencode-ai/llm"

export class HeaderTimeoutError extends Error {
  public override readonly name = "ProviderHeaderTimeoutError"

  constructor(public readonly ms: number) {
    super(`Provider response headers timed out after ${ms}ms`)
  }
}

export class ResponseStreamError extends Error {
  public override readonly name = "ProviderResponseStreamError"

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

function isOpenAiErrorRetryable(e: APICallError) {
  const status = e.statusCode
  if (!status) return e.isRetryable
  // openai sometimes returns 404 for models that are actually available
  return status === 404 || e.isRetryable
}

// Providers not reliably handled in this function:
// - z.ai: can accept overflow silently (needs token-count/context-window checks)
function message(providerID: ProviderV2.ID, e: APICallError) {
  return iife(() => {
    const msg = e.message
    if (msg === "") {
      if (e.responseBody) return e.responseBody
      if (e.statusCode) {
        const err = STATUS_CODES[e.statusCode]
        if (err) return err
      }
      return "Unknown error"
    }

    if (!e.responseBody || (e.statusCode && msg !== STATUS_CODES[e.statusCode])) {
      return msg
    }

    try {
      const body = JSON.parse(e.responseBody)
      if (providerID === "swiftcoder") {
        const mapped = swiftScaleErrorMessage(body, e.statusCode)
        if (mapped) return mapped
      }
      // try to extract common error message fields
      const errMsg = body.message || body.error || body.error?.message
      if (errMsg && typeof errMsg === "string") {
        return `${msg}: ${errMsg}`
      }
    } catch {}

    // If responseBody is HTML (e.g. from a gateway or proxy error page),
    // provide a human-readable message instead of dumping raw markup
    if (/^\s*<!doctype|^\s*<html/i.test(e.responseBody)) {
      if (e.statusCode === 401) {
        return "Unauthorized: request was blocked by a gateway or proxy. Your authentication token may be missing or expired — try running `swiftcoder auth login <your provider URL>` to re-authenticate."
      }
      if (e.statusCode === 403) {
        return "Forbidden: request was blocked by a gateway or proxy. You may not have permission to access this resource — check your account and provider settings."
      }
      return msg
    }

    return `${msg}: ${e.responseBody}`
  }).trim()
}

export function swiftScaleErrorMessage(input: unknown, statusCode?: number) {
  const body = json(input)
  const code = typeof body?.error?.code === "string" ? body.error.code : undefined
  const rawError = typeof body?.error === "string" ? body.error.toLowerCase() : undefined
  const requestID = typeof body?.request_id === "string" ? body.request_id : undefined
  const suffix = requestID ? ` Request ID: ${requestID}.` : ""
  if (rawError?.includes("invalid or missing api key") || rawError?.includes("invalid api key")) {
    return `Your SwiftScale session is not valid. Sign in again.${suffix}`
  }
  switch (code) {
    case "unauthorized":
    case "token_expired":
      return `Your SwiftScale session has expired. Sign in again.${suffix}`
    case "token_refresh_failed":
    case "token_invalid_after_refresh":
      return `Your SwiftScale session could not be refreshed. Sign in again.${suffix}`
    case "entitlement_required":
    case "model_not_entitled":
      return `This model is not included in your SwiftScale plan.${suffix}`
    case "rate_limit_exceeded":
      return `SwiftScale rate limit reached. Wait briefly and retry.${suffix}`
    case "fair_use_limited":
      return `SwiftScale fair-use capacity is temporarily limited. Wait briefly and retry.${suffix}`
    case "budget_exhausted":
      return `Your SwiftScale usage budget is exhausted. Review your plan and billing.${suffix}`
    case "service_degraded":
      return `SwiftScale is operating in a degraded mode. Responses may be slower or use reduced context.${suffix}`
    case "service_unavailable":
    case "model_unavailable":
      return `SwiftScale is temporarily unavailable. Retry shortly.${suffix}`
  }
  if (statusCode === 401) return `Your SwiftScale session is not valid. Sign in again.${suffix}`
  if (statusCode === 403) return `Your SwiftScale plan does not allow this request.${suffix}`
  if (statusCode === 429) return `SwiftScale rate limit reached. Wait briefly and retry.${suffix}`
  if (statusCode && statusCode >= 500) return `SwiftScale is temporarily unavailable. Retry shortly.${suffix}`
}

function json(input: unknown) {
  if (typeof input === "string") {
    try {
      const result = JSON.parse(input)
      if (result && typeof result === "object") return result
      return undefined
    } catch {
      return undefined
    }
  }
  if (typeof input === "object" && input !== null) {
    return input
  }
  return undefined
}

export type ParsedStreamError =
  | {
      type: "context_overflow"
      message: string
      responseBody: string
    }
  | {
      type: "api_error"
      message: string
      isRetryable: boolean
      responseBody: string
    }

export function parseStreamError(input: unknown): ParsedStreamError | undefined {
  const raw = json(input)
  const body = typeof raw?.message === "string" ? (json(raw.message) ?? raw) : raw
  if (!body) return

  const responseBody = JSON.stringify(body)
  if (body.type !== "error") return

  switch (body?.error?.code) {
    case "context_length_exceeded":
      return {
        type: "context_overflow",
        message: "Input exceeds context window of this model",
        responseBody,
      }
    case "insufficient_quota":
      return {
        type: "api_error",
        message: "Quota exceeded. Check your plan and billing details.",
        isRetryable: false,
        responseBody,
      }
    case "usage_not_included":
      return {
        type: "api_error",
        message: "This request is not included in your SwiftScale plan. Review your plan at https://swift-scale.com.",
        isRetryable: false,
        responseBody,
      }
    case "budget_exhausted":
      return {
        type: "api_error",
        message: "Your SwiftScale usage budget is exhausted. Review your plan and billing.",
        isRetryable: false,
        responseBody,
      }
    case "fair_use_limited":
    case "service_degraded":
      return {
        type: "api_error",
        message:
          typeof body?.error?.message === "string"
            ? body.error.message
            : "SwiftScale capacity is temporarily limited. Retry shortly.",
        isRetryable: true,
        responseBody,
      }
    case "invalid_prompt":
      return {
        type: "api_error",
        message: typeof body?.error?.message === "string" ? body?.error?.message : "Invalid prompt.",
        isRetryable: false,
        responseBody,
      }
    case "server_is_overloaded":
    case "server_error":
      return {
        type: "api_error",
        message: typeof body?.error?.message === "string" ? body?.error?.message : "Server error.",
        isRetryable: true,
        responseBody,
      }
  }
}

export type ParsedAPICallError =
  | {
      type: "context_overflow"
      message: string
      responseBody?: string
    }
  | {
      type: "api_error"
      message: string
      statusCode?: number
      isRetryable: boolean
      responseHeaders?: Record<string, string>
      responseBody?: string
      metadata?: Record<string, string>
    }

export function parseAPICallError(input: { providerID: ProviderV2.ID; error: APICallError }): ParsedAPICallError {
  const m = message(input.providerID, input.error)
  const body = json(input.error.responseBody)
  if (isContextOverflow(m) || input.error.statusCode === 413 || body?.error?.code === "context_length_exceeded") {
    return {
      type: "context_overflow",
      message: m,
      responseBody: input.error.responseBody,
    }
  }

  const requestID = input.error.responseHeaders?.["x-request-id"]
  const traceID = input.error.responseHeaders?.["x-swiftscale-trace-id"]
  const metadata = {
    ...(input.error.url ? { url: input.error.url } : {}),
    ...(requestID ? { requestID } : {}),
    ...(traceID ? { traceID } : {}),
  }
  return {
    type: "api_error",
    message: m,
    statusCode: input.error.statusCode,
    isRetryable: input.providerID.startsWith("openai")
      ? isOpenAiErrorRetryable(input.error)
      : input.providerID === "swiftcoder" &&
          (input.error.statusCode === 429 || (input.error.statusCode !== undefined && input.error.statusCode >= 500))
        ? true
        : input.error.isRetryable,
    responseHeaders: input.error.responseHeaders,
    responseBody: input.error.responseBody,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  }
}

export * as ProviderError from "./error"
