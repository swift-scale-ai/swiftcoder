import { app } from "electron"

type Channel = "dev" | "beta" | "prod"
const raw = import.meta.env.SWIFTCODER_CHANNEL
export const CHANNEL: Channel = raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

// Development launches do not have a signed update target. Packaged beta and
// production builds use the channel-specific SwiftScale release feed.
export const UPDATER_ENABLED = app.isPackaged && CHANNEL !== "dev"
