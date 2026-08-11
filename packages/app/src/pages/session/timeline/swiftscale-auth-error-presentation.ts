import type { SwiftScaleAuthStatus } from "@/context/platform"

export type SwiftScaleAuthErrorPresentation = {
  kind: "checking" | "sign_in" | "retry"
  title: string
  description: string
  action?: string
}

export function swiftScaleAuthErrorPresentation(
  status?: SwiftScaleAuthStatus,
  options: { reauthenticate?: boolean } = {},
): SwiftScaleAuthErrorPresentation {
  if (!status) {
    return {
      kind: "checking",
      title: "Checking SwiftScale access",
      description: "Confirming your current account and model access.",
    }
  }

  if (options.reauthenticate) {
    return {
      kind: "sign_in",
      title: "Reconnect SwiftScale",
      description: "Your session could not be refreshed automatically. Sign in again to continue.",
      action: "Reconnect",
    }
  }

  if (status.state === "signed_in") {
    return {
      kind: "retry",
      title: "Previous request was not authenticated",
      description: "Retry this request with your current SwiftScale account access.",
      action: "Retry",
    }
  }

  return {
    kind: "sign_in",
    title: "SwiftScale sign-in required",
    description: "Sign in to continue this task with your available models.",
    action: "Sign in",
  }
}
