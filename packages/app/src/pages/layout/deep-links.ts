export const deepLinkEvent = "swiftcoder:deep-link"

const parseUrl = (input: string) => {
  if (!input.startsWith("swiftcoder://")) return
  if (typeof URL.canParse === "function" && !URL.canParse(input)) return
  try {
    return new URL(input)
  } catch {
    return
  }
}

export const parseDeepLink = (input: string) => {
  const url = parseUrl(input)
  if (!url) return
  if (url.hostname !== "open-project") return
  const directory = url.searchParams.get("directory")
  if (!directory) return
  return directory
}

export const parseNewSessionDeepLink = (input: string) => {
  const url = parseUrl(input)
  if (!url) return
  if (url.hostname !== "new-session") return
  const directory = url.searchParams.get("directory")
  if (!directory) return
  const prompt = url.searchParams.get("prompt") || undefined
  if (!prompt) return { directory }
  return { directory, prompt }
}

export type BillingCallback = { result: "success" | "cancel" }

export const parseBillingCallbackDeepLink = (input: string): BillingCallback | undefined => {
  const url = parseUrl(input)
  if (!url) return
  if (url.hostname !== "billing" || url.pathname !== "/complete") return
  if (url.username || url.password || url.port || url.hash) return
  if ([...url.searchParams.keys()].some((key) => key !== "result")) return
  const result = url.searchParams.get("result")
  if (result !== "success" && result !== "cancel") return
  return { result }
}

export const collectOpenProjectDeepLinks = (urls: string[]) =>
  urls.map(parseDeepLink).filter((directory): directory is string => !!directory)

export const collectNewSessionDeepLinks = (urls: string[]) =>
  urls.map(parseNewSessionDeepLink).filter((link): link is { directory: string; prompt?: string } => !!link)

export const collectBillingCallbackDeepLinks = (urls: string[]) =>
  urls.map(parseBillingCallbackDeepLink).filter((link): link is BillingCallback => !!link)

type SwiftCoderWindow = Window & {
  __SWIFTCODER__?: {
    deepLinks?: string[]
  }
}

export const drainPendingDeepLinks = (target: SwiftCoderWindow) => {
  const pending = target.__SWIFTCODER__?.deepLinks ?? []
  if (pending.length === 0) return []
  if (target.__SWIFTCODER__) target.__SWIFTCODER__.deepLinks = []
  return pending
}
