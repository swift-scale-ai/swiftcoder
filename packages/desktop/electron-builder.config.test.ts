import { expect, test } from "bun:test"
import type { Configuration } from "electron-builder"

const channels = [
  { channel: "dev", appId: "com.swift-scale.swiftcoder.dev", productName: "SwiftCoder_Dev" },
  { channel: "beta", appId: "com.swift-scale.swiftcoder.beta", productName: "SwiftCoder Beta" },
  { channel: "prod", appId: "com.swift-scale.swiftcoder", productName: "SwiftCoder" },
] as const

for (const channel of channels) {
  test(`uses the macOS identity and hardened runtime for ${channel.channel}`, async () => {
    const previous = process.env.SWIFTCODER_CHANNEL
    process.env.SWIFTCODER_CHANNEL = channel.channel

    const module = await import(`./electron-builder.config.ts?channel=${channel.channel}`)
    const config = module.default as Configuration

    if (previous === undefined) delete process.env.SWIFTCODER_CHANNEL
    else process.env.SWIFTCODER_CHANNEL = previous

    expect(config.appId).toBe(channel.appId)
    expect(config.productName).toBe(channel.productName)
    expect(config.mac?.hardenedRuntime).toBe(true)
    expect(config.mac?.target).toEqual(["dmg", "zip"])
    expect(config.protocols).toMatchObject({ schemes: ["swiftcoder"] })
    expect(config.publish).toEqual({
      provider: "generic",
      url: `https://swiftcoder.io/releases/${channel.channel}`,
      channel: "latest",
    })
    expect(config.win).toBeUndefined()
    expect(config.linux).toBeUndefined()
  })
}

test("uses the release version in package metadata and immutable artifact names", async () => {
  const previous = process.env.SWIFTCODER_VERSION
  process.env.SWIFTCODER_VERSION = "0.1.0-beta.2"
  const module = await import("./electron-builder.config.ts?release-version")
  const config = module.default as Configuration
  if (previous === undefined) delete process.env.SWIFTCODER_VERSION
  else process.env.SWIFTCODER_VERSION = previous

  expect(config.extraMetadata).toMatchObject({ version: "0.1.0-beta.2" })
  expect(config.artifactName).toBe("swiftcoder-${version}-${os}-${arch}.${ext}")
})

test("uses an integer macOS build version", async () => {
  const previous = process.env.SWIFTCODER_BUILD_VERSION
  process.env.SWIFTCODER_BUILD_VERSION = "42"
  const module = await import("./electron-builder.config.ts?build-version")
  const config = module.default as Configuration
  if (previous === undefined) delete process.env.SWIFTCODER_BUILD_VERSION
  else process.env.SWIFTCODER_BUILD_VERSION = previous

  expect(config.buildVersion).toBe("42")
})

test("excludes non-macOS resources from packaged apps", async () => {
  const module = await import("./electron-builder.config.ts?mac-only")
  const config = module.default as Configuration
  expect(config.files).toContain("!resources/linux/**")
  expect(config.files).toContain("!resources/*.metainfo.xml")
})

test("excludes source maps from distributed apps", async () => {
  const module = await import("./electron-builder.config.ts?no-source-maps")
  const config = module.default as Configuration
  expect(config.files).toContain("!out/**/*.map")
})

test("bundles the CLI outside the dev app archive", async () => {
  const previous = process.env.SWIFTCODER_CHANNEL
  process.env.SWIFTCODER_CHANNEL = "dev"
  const module = await import("./electron-builder.config.ts?cli-resource")
  const config = module.default as Configuration
  if (previous === undefined) delete process.env.SWIFTCODER_CHANNEL
  else process.env.SWIFTCODER_CHANNEL = previous

  expect(config.files).toContain("!resources/swiftcoder-cli*")
  expect(config.extraResources).toContainEqual({
    from: "resources/",
    to: "",
    filter: ["swiftcoder-cli*"],
  })
})

for (const channel of ["beta", "prod"] as const) {
  test(`does not bundle the CLI in ${channel} builds`, async () => {
    const previous = process.env.SWIFTCODER_CHANNEL
    process.env.SWIFTCODER_CHANNEL = channel
    const module = await import(`./electron-builder.config.ts?no-cli-resource=${channel}`)
    const config = module.default as Configuration
    if (previous === undefined) delete process.env.SWIFTCODER_CHANNEL
    else process.env.SWIFTCODER_CHANNEL = previous

    expect(config.extraResources).not.toContainEqual({
      from: "resources/",
      to: "",
      filter: ["swiftcoder-cli*"],
    })
  })
}
