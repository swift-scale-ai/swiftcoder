import { createSimpleContext } from "@swiftscale/ui/context"

export type SessionPlacement = "chat" | "project"

export const { use: useSessionPlacement, provider: SessionPlacementProvider } = createSimpleContext({
  name: "SessionPlacement",
  gate: false,
  init: (props: { get: (sessionID: string) => SessionPlacement | undefined }) => props,
})
