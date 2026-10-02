import { $ } from "bun"
import { downloadCliToResources } from "./utils"
import { resolveBuildVersion } from "./build-version"

process.env.SWIFTCODER_VERSION = resolveBuildVersion(process.env.SWIFTCODER_CHANNEL ?? "dev")

await $`bun run install-electron`

await $`bun ./scripts/copy-icons.ts ${process.env.SWIFTCODER_CHANNEL ?? "dev"}`

await $`cd ../opencode && bun script/build-node.ts`
await downloadCliToResources()
