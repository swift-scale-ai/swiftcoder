export const SWIFTSCALE_MODEL_FAMILIES = ["GPT", "Claude", "Gemini", "SwiftScale"] as const

export type SwiftScaleModelFamily = (typeof SWIFTSCALE_MODEL_FAMILIES)[number]

const SWIFTSCALE_MODEL_FAMILY_PROVIDER_IDS: Record<SwiftScaleModelFamily, string> = {
  GPT: "openai",
  Claude: "anthropic",
  Gemini: "google",
  SwiftScale: "swiftcoder",
}

export function swiftScaleModelFamily(model: { id: string; name: string }): SwiftScaleModelFamily {
  const value = `${model.id} ${model.name}`.toLowerCase()
  if (/(^|[\s/._-])gpt([\s/._-]|$)/.test(value)) return "GPT"
  if (/(^|[\s/._-])claude([\s/._-]|$)/.test(value)) return "Claude"
  if (/(^|[\s/._-])gemini([\s/._-]|$)/.test(value)) return "Gemini"
  return "SwiftScale"
}

export function connectedProviderModelFamily(model: {
  id: string
  name: string
  provider: { id: string }
}): SwiftScaleModelFamily {
  if (model.provider.id === "openai") return "GPT"
  if (model.provider.id === "anthropic") return "Claude"
  if (model.provider.id === "google") return "Gemini"
  return swiftScaleModelFamily(model)
}

export function sortSwiftScaleModelFamilies(a: SwiftScaleModelFamily, b: SwiftScaleModelFamily) {
  return SWIFTSCALE_MODEL_FAMILIES.indexOf(a) - SWIFTSCALE_MODEL_FAMILIES.indexOf(b)
}

export function preferredSwiftScaleModel<T extends { id: string; name: string }>(models: T[]) {
  const swiftScale = models
    .filter((model) => swiftScaleModelFamily(model) === "SwiftScale")
    .sort((a, b) => a.name.localeCompare(b.name))
  const swiftPro = swiftScale.find((model) => {
    const id = model.id.trim().toLowerCase().split("/").at(-1)
    const name = model.name.trim().toLowerCase()
    return id === "swiftpro.auto" || id === "swift-pro" || name === "swift pro"
  })
  return swiftPro ?? swiftScale[0] ?? models[0]
}

export function swiftScaleModelFamilyProviderID(family: SwiftScaleModelFamily) {
  return SWIFTSCALE_MODEL_FAMILY_PROVIDER_IDS[family]
}

export function groupSwiftScaleModelsByFamily<T extends { id: string; name: string }>(models: T[]) {
  return SWIFTSCALE_MODEL_FAMILIES.map((family) => ({
    family,
    models: models.filter((model) => swiftScaleModelFamily(model) === family),
  })).filter((group) => group.models.length > 0)
}
