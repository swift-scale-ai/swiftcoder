import { run as runTui, type TuiInput } from "@swiftscale/coder-tui"
import { Global } from "@swiftscale/core/global"
import { AppNodeBuilder } from "@swiftscale/core/effect/app-node-builder"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(AppNodeBuilder.build(Global.node)))
}
