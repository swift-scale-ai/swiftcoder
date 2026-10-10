declare global {
  const SWIFTCODER_VERSION: string
  const SWIFTCODER_CHANNEL: string
}

export const InstallationVersion = typeof SWIFTCODER_VERSION === "string" ? SWIFTCODER_VERSION : "local"
export const InstallationChannel = typeof SWIFTCODER_CHANNEL === "string" ? SWIFTCODER_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
