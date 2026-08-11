import { resolveChannel } from "./utils"
import { rm } from "node:fs/promises"

const arg = process.argv[2]
const channel = arg === "dev" || arg === "beta" || arg === "prod" ? arg : resolveChannel()

const appId = channel === "prod" ? "com.swift-scale.swiftcoder" : `com.swift-scale.swiftcoder.${channel}`
const productName = channel === "prod" ? "SwiftCoder" : `SwiftCoder ${channel.charAt(0).toUpperCase() + channel.slice(1)}`
const summary = `Open source AI coding agent${channel !== "prod" ? ` (${channel})` : ""}`

await Promise.all(
  [
    "ai.swiftscale.swiftcoder.metainfo.xml",
    "ai.swiftscale.swiftcoder.dev.metainfo.xml",
    "ai.swiftscale.swiftcoder.beta.metainfo.xml",
  ].map((filename) => rm(`resources/${filename}`, { force: true })),
)

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${appId}</id>

  <metadata_license>CC0-1.0</metadata_license>
  <project_license>MIT</project_license>

  <name>${productName}</name>
  <summary>${summary}</summary>

  <developer id="ly.anoma">
    <name>Anomaly Innovations Inc.</name>
  </developer>

  <description>
    <p>
      SwiftCoder is an open source agent that helps you write and run code with any AI model.
    </p>
  </description>

  <launchable type="desktop-id">${appId}.desktop</launchable>

  <content_rating type="oars-1.1" />

  <url type="bugtracker">https://swift-scale.com/support/swiftcoder</url>
  <url type="homepage">https://swiftcoder.io</url>
  <url type="vcs-browser">https://swift-scale.com/swiftcoder</url>

  <screenshots>
    <screenshot type="default">
      <image>https://swift-scale.com/assets/swiftcoder/screenshot.png</image>
    </screenshot>
  </screenshots>
</component>
`

await Bun.write(`resources/${appId}.metainfo.xml`, xml)
console.log(`Generated metainfo for ${channel} at resources/${appId}.metainfo.xml`)
