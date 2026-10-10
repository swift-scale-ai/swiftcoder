#!/usr/bin/env bun
import { $ } from "bun"

import { buildCliToResources, resolveChannel } from "./utils"
import { resolveBuildVersion } from "./build-version"

const channel = resolveChannel()
process.env.SWIFTCODER_VERSION = resolveBuildVersion(channel)
await $`bun ./scripts/copy-icons.ts ${channel}`
await $`bun ./scripts/copy-metainfo.ts ${channel}`

if (channel === "dev") await buildCliToResources()
// The CLI build clears agent/dist, so build the Node sidecar after it.
await $`cd ../agent && bun script/build-node.ts`
