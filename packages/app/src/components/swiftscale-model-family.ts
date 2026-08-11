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

export function sortSwiftScaleModelFamilies(a: SwiftScaleModelFamily, b: SwiftScaleModelFamily) {
  return SWIFTSCALE_MODEL_FAMILIES.indexOf(a) - SWIFTSCALE_MODEL_FAMILIES.indexOf(b)
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
