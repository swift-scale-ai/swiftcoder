import { SwiftCoderPlugin } from "./provider/swiftcoder"
import type { PluginInternal } from "./internal"
import type { Scope } from "effect"

export const ProviderPlugins: PluginInternal.Plugin<PluginInternal.Requirements | Scope.Scope>[] = [
  SwiftCoderPlugin,
]
