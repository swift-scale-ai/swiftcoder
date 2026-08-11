import type { SwiftScaleAuthStatus, SwiftScaleEntitlements } from "@/context/platform"
import {
  swiftScaleAccountDisplayName,
  swiftScaleAccountPresentation,
} from "@/components/swiftscale-account-presentation"

export type AccountSummary = {
  label: string
  detail?: string
  tone: "neutral" | "available" | "warning" | "critical"
}

export function accountSummary(status: SwiftScaleAuthStatus, entitlements?: SwiftScaleEntitlements): AccountSummary {
  if (status.state !== "signed_in") return { label: "Sign in", tone: "neutral" }
  if (!entitlements)
    return { label: swiftScaleAccountDisplayName(status.account), detail: "Loading plan", tone: "neutral" }

  const plan = swiftScaleAccountPresentation(entitlements)
  if (entitlements.service.status === "outage") return { label: plan.title, detail: "Service outage", tone: "critical" }
  if (entitlements.service.status === "degraded")
    return { label: plan.title, detail: "Service degraded", tone: "warning" }
  if (entitlements.usage.level === "exhausted")
    return { label: plan.title, detail: "Usage exhausted", tone: "critical" }
  if (entitlements.usage.level === "limited") return { label: plan.title, detail: "Usage limited", tone: "warning" }
  return { label: plan.title, detail: plan.apiOnly ? "Pay as you go" : "Usage available", tone: "available" }
}
