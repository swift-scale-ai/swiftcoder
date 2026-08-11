const authErrorPatterns = [
  "invalid or missing api key",
  "invalid api key",
  "missing api key",
  "swiftscale session has expired",
  "swiftscale session is not valid",
  "swiftscale session could not be refreshed",
]

export function isSwiftScaleAuthError(message: string) {
  const normalized = message.toLowerCase()
  return authErrorPatterns.some((pattern) => normalized.includes(pattern))
}

const availabilityErrorPatterns = [
  "control plane is temporarily unavailable",
  "swiftscale is temporarily unavailable",
  "service temporarily unavailable",
  "service unavailable",
]

export function isSwiftScaleAvailabilityError(message: string) {
  const normalized = message.toLowerCase()
  return availabilityErrorPatterns.some((pattern) => normalized.includes(pattern))
}

export function isSwiftScaleReauthenticationError(message: string) {
  return message.toLowerCase().includes("swiftscale session could not be refreshed")
}
