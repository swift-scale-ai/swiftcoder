import { createSimpleContext } from "@opencode-ai/ui/context"

export type SessionPlacement = "chat" | "project"

export const { use: useSessionPlacement, provider: SessionPlacementProvider } = createSimpleContext({
  name: "SessionPlacement",
  gate: false,
  init: (props: { get: (sessionID: string) => SessionPlacement | undefined }) => props,
})
