#!/usr/bin/env bun
import { $ } from "bun"

import { buildCliToResources, resolveChannel } from "./utils"
import { resolveBuildVersion } from "./build-version"

const channel = resolveChannel()
process.env.SWIFTCODER_VERSION = resolveBuildVersion(channel)
await $`bun ./scripts/copy-icons.ts ${channel}`
await $`bun ./scripts/copy-metainfo.ts ${channel}`

await $`cd ../agent && bun script/build-node.ts`
if (channel === "dev") await buildCliToResources()
