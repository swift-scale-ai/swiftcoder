import path from "node:path"
import { fileURLToPath } from "node:url"

import type { Configuration } from "electron-builder"

const packageDir = path.dirname(fileURLToPath(import.meta.url))

const channel = (() => {
  const raw = process.env.SWIFTCODER_CHANNEL
  if (raw === "dev" || raw === "beta" || raw === "prod") return raw
  return "dev"
})()

const releaseVersion = process.env.SWIFTCODER_VERSION?.trim()
if (releaseVersion && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(releaseVersion)) {
  throw new Error(`Invalid SWIFTCODER_VERSION: ${releaseVersion}`)
}
const buildVersion = process.env.SWIFTCODER_BUILD_VERSION?.trim() || "1"
if (!/^[1-9]\d*$/.test(buildVersion)) {
  throw new Error(`Invalid SWIFTCODER_BUILD_VERSION: ${buildVersion}`)
}

const APP_IDS = {
  dev: "com.swift-scale.swiftcoder.dev",
  beta: "com.swift-scale.swiftcoder.beta",
  prod: "com.swift-scale.swiftcoder",
} as const

const getBase = (appId: string): Configuration => ({
  electronDist: path.join(packageDir, "node_modules/electron/dist"),
  artifactName: "swiftcoder-${version}-${os}-${arch}.${ext}",
  buildVersion,
  ...(releaseVersion ? { extraMetadata: { version: releaseVersion } } : {}),
  directories: {
    output: "dist",
    buildResources: "resources",
  },
  files: [
    "out/**/*",
    "!**/*.map",
    "resources/**/*",
    "!resources/swiftcoder-cli*",
    "!resources/linux/**",
    "!resources/*.metainfo.xml",
  ],
  extraResources: [
    { from: path.join(packageDir, "../../LICENSE"), to: "legal/LICENSE.txt" },
    { from: path.join(packageDir, "../../THIRD_PARTY_NOTICES.md"), to: "legal/THIRD_PARTY_NOTICES.md" },
    {
      from: path.join(packageDir, "../../THIRD_PARTY_DEPENDENCIES.md"),
      to: "legal/THIRD_PARTY_DEPENDENCIES.md",
    },
    { from: path.join(packageDir, "../../TRADEMARKS.md"), to: "legal/TRADEMARKS.md" },
    { from: path.join(packageDir, "../../legal"), to: "legal/licenses" },
    ...(channel === "dev"
      ? [
          {
            from: "resources/",
            to: "",
            filter: ["swiftcoder-cli*"],
          },
        ]
      : []),
  ],
  mac: {
    category: "public.app-category.developer-tools",
    icon: `resources/icons/icon.icns`,
    electronLanguages: ["en", "zh_CN", "zh_TW", "fr", "de", "es", "pt_BR", "ja", "ko", "ru"],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "resources/entitlements.plist",
    entitlementsInherit: "resources/entitlements.plist",
    notarize: process.env.SWIFTCODER_SKIP_NOTARIZE === "1" ? false : true,
    target: ["dmg", "zip"],
  },
  dmg: {
    sign: true,
  },
  protocols: {
    name: "SwiftCoder",
    schemes: ["swiftcoder"],
  },
  publish: {
    provider: "generic",
    url: `https://swiftcoder.io/releases/${channel}`,
    channel: "latest",
  },
})

function getConfig() {
  const appId = APP_IDS[channel]
  const base = getBase(appId)

  switch (channel) {
    case "dev": {
      return {
        ...base,
        appId,
        productName: "SwiftCoder_Dev",
      }
    }
    case "beta": {
      return {
        ...base,
        appId,
        productName: "SwiftCoder Beta",
        protocols: { name: "SwiftCoder Beta", schemes: ["swiftcoder"] },
      }
    }
    case "prod": {
      return {
        ...base,
        appId,
        productName: "SwiftCoder",
        protocols: { name: "SwiftCoder", schemes: ["swiftcoder"] },
      }
    }
  }
}

export default getConfig()
