const commercialFamily = /(?:^|[\s._/-])(gpt|claude|gemini)(?:[\s._/-]|$)/i
const directCommercialProviders = new Set(["openai", "anthropic", "google"])

export function isCommercialSwiftScaleModel(model: { id: string; name: string }) {
  return commercialFamily.test(model.id) || commercialFamily.test(model.name)
}

export type SwiftScaleModelProducts = {
  coding: { enabled: boolean; models: string[] }
  apiServices: { enabled: boolean; models: string[] }
}

export type SwiftScaleProductMode = "coding" | "api_services"

const modelAliases = (id: string) => {
  const normalized = id.trim().toLowerCase()
  const parts = normalized.split("/")
  return new Set([normalized, parts.at(-1) ?? normalized])
}

export function isSwiftCoderTextModel(model: { id: string }) {
  return !/^swift(?:[./_-]?(?:audio|image))(?:[./_-]|$)/i.test(model.id.trim())
}

export function isDirectCommercialTextModel(model: {
  provider: { id: string }
  capabilities: { input: { text: boolean }; output: { text: boolean } }
}) {
  return (
    directCommercialProviders.has(model.provider.id) && model.capabilities.input.text && model.capabilities.output.text
  )
}

export function selectDirectCommercialTextModels<
  T extends {
    id: string
    provider: { id: string }
    capabilities: { input: { text: boolean }; output: { text: boolean } }
  },
>(models: T[], visible: (model: T) => boolean) {
  const candidates = models.filter(isDirectCommercialTextModel)
  const byKey = new Map(candidates.map((model) => [`${model.provider.id}:${model.id}`, model]))
  const selected = candidates.filter(visible).map((model) => {
    if (!/^gpt-\d+(?:\.\d+)+$/.test(model.id)) return model
    return byKey.get(`${model.provider.id}:${model.id}-sol`) ?? model
  })
  return [...new Map(selected.map((model) => [`${model.provider.id}:${model.id}`, model])).values()]
}

export function filterDirectCommercialModelsByProducts<
  T extends {
    id: string
    provider: { id: string }
    capabilities: { input: { text: boolean }; output: { text: boolean } }
  },
>(models: T[], products?: SwiftScaleModelProducts) {
  if (!products?.apiServices.enabled || products.apiServices.models.length === 0) return []

  const allowed = new Set(products.apiServices.models.flatMap((id) => [...modelAliases(id)]))
  return models.filter((model) => {
    if (!isDirectCommercialTextModel(model)) return false
    return [...modelAliases(model.id)].some((alias) => allowed.has(alias))
  })
}

export function filterSwiftScaleModelsByProducts<T extends { id: string }>(
  models: T[],
  products?: SwiftScaleModelProducts,
) {
  const textModels = models.filter(isSwiftCoderTextModel)
  if (!products) return textModels

  // Older desktop entitlement responses use an empty API Services model list to
  // mean "use the account-scoped Gateway catalog". The provider has already
  // fetched that catalog with the user's credential before this filter runs.
  if (products.apiServices.enabled && products.apiServices.models.length === 0) return textModels

  const allowed = new Set<string>()
  for (const product of [products.coding, products.apiServices]) {
    if (!product.enabled) continue
    for (const id of product.models) {
      for (const alias of modelAliases(id)) allowed.add(alias)
    }
  }

  return textModels.filter((model) => [...modelAliases(model.id)].some((alias) => allowed.has(alias)))
}

export function effectiveSwiftScaleProductMode(
  products: SwiftScaleModelProducts | undefined,
  preferred: SwiftScaleProductMode,
): SwiftScaleProductMode {
  if (!products) return preferred
  if (products.coding.enabled && products.apiServices.enabled) return preferred
  if (products.apiServices.enabled) return "api_services"
  return "coding"
}

export function filterSwiftScaleModelsByProductMode<T extends { id: string }>(
  models: T[],
  products: SwiftScaleModelProducts | undefined,
  mode: SwiftScaleProductMode,
) {
  const entitled = filterSwiftScaleModelsByProducts(models, products)
  if (!products) return entitled

  const effective = effectiveSwiftScaleProductMode(products, mode)
  const product = effective === "coding" ? products.coding : products.apiServices
  if (!product.enabled) return []
  if (effective === "api_services" && product.models.length === 0) return entitled

  const allowed = new Set(product.models.flatMap((id) => [...modelAliases(id)]))
  const coding = new Set(products.coding.models.flatMap((id) => [...modelAliases(id)]))
  return entitled.filter((model) => {
    const aliases = [...modelAliases(model.id)]
    if (!aliases.some((alias) => allowed.has(alias))) return false
    if (effective !== "api_services" || !products.coding.enabled) return true
    return !aliases.some((alias) => coding.has(alias))
  })
}

export function swiftScaleProductAccess(input: {
  accountPlan?: "coding" | "api_services"
  entitlementProduct?: "coding" | "api_services"
  products?: { coding: boolean; apiServices: boolean }
  providerConnected: boolean
}) {
  const product = input.entitlementProduct ?? input.accountPlan
  return {
    coding: input.products?.coding ?? product === "coding",
    apiServices: input.products?.apiServices ?? (product === "api_services" || (!product && input.providerConnected)),
    known: input.products !== undefined || product !== undefined || input.providerConnected,
  }
}
