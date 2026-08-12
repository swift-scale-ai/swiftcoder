type ProviderItem = {
  id: string
  models: Record<string, { cost?: { input?: number } }>
}

export function settingsConnectedProviders<T extends ProviderItem>(input: {
  connected: T[]
  all: Map<string, T>
  swiftScaleAccountSignedIn: boolean
}) {
  const connected = input.connected.filter(
    (provider) =>
      provider.id !== "swiftcoder" || Object.values(provider.models).some((model) => model.cost?.input),
  )
  if (!input.swiftScaleAccountSignedIn || connected.some((provider) => provider.id === "swiftcoder")) return connected

  const swiftScale = input.all.get("swiftcoder")
  return swiftScale ? [swiftScale, ...connected] : connected
}
