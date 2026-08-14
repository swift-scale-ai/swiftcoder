import { defineDesktopProduct } from "@swiftscale/desktop-kit"

export const SWIFTCODER_DESKTOP_PRODUCT = defineDesktopProduct({
  id: "coder",
  name: "SwiftCoder",
  shortName: "Coder",
  protocol: "swiftcoder",
  storageNamespace: "swiftcoder",
  renderer: {
    scheme: "swiftcoder-app",
    host: "renderer",
  },
  channels: {
    dev: {
      appId: "com.swift-scale.swiftcoder.dev",
      name: "SwiftCoder_Dev",
      updatePath: "/releases/dev",
    },
    beta: {
      appId: "com.swift-scale.swiftcoder.beta",
      name: "SwiftCoder Beta",
      updatePath: "/releases/beta",
    },
    prod: {
      appId: "com.swift-scale.swiftcoder",
      name: "SwiftCoder",
      updatePath: "/releases/prod",
    },
  },
  window: {
    defaultWidth: 1280,
    minimumWidth: 900,
    minimumHeight: 600,
    fillAvailableHeight: true,
  },
})
