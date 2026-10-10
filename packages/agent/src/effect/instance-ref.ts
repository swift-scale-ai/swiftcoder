import { Context } from "effect"
import type { InstanceContext } from "@/project/instance-context"
import type { WorkspaceV2 } from "@swiftscale/core/workspace"

export const InstanceRef = Context.Reference<InstanceContext | undefined>("~swiftcoder/InstanceRef", {
  defaultValue: () => undefined,
})

export const WorkspaceRef = Context.Reference<WorkspaceV2.ID | undefined>("~swiftcoder/WorkspaceRef", {
  defaultValue: () => undefined,
})
