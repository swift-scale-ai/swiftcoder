export type DesktopChannel = "dev" | "beta" | "prod"

export type DesktopProductChannel = {
  appId: string
  name: string
  updatePath: string
}

export type DesktopProduct = {
  id: string
  name: string
  shortName: string
  protocol: string
  storageNamespace: string
  renderer: {
    scheme: string
    host: string
  }
  channels: Record<DesktopChannel, DesktopProductChannel>
  window: {
    defaultWidth: number
    minimumWidth: number
    minimumHeight: number
    fillAvailableHeight: boolean
  }
}

/** Product-owned values consumed by the product-neutral desktop shell. */
export type DesktopProductAdapter = DesktopProduct

const identifier = /^[a-z][a-z0-9-]*$/
const appIdentifier = /^[a-zA-Z0-9][a-zA-Z0-9.-]+$/

export function defineDesktopProduct<const T extends DesktopProduct>(product: T): T {
  if (!identifier.test(product.id)) throw new Error(`Invalid desktop product id: ${product.id}`)
  if (!identifier.test(product.protocol)) throw new Error(`Invalid desktop protocol: ${product.protocol}`)
  if (!identifier.test(product.renderer.scheme)) {
    throw new Error(`Invalid renderer protocol: ${product.renderer.scheme}`)
  }
  if (!product.renderer.host) throw new Error("Desktop renderer host is required")
  if (product.window.defaultWidth < product.window.minimumWidth) {
    throw new Error("Desktop default width cannot be smaller than the minimum width")
  }
  for (const [channel, value] of Object.entries(product.channels)) {
    if (!appIdentifier.test(value.appId)) throw new Error(`Invalid ${channel} application id: ${value.appId}`)
    if (!value.name.trim()) throw new Error(`Desktop ${channel} name is required`)
    if (!value.updatePath.startsWith("/")) throw new Error(`Desktop ${channel} update path must be absolute`)
  }
  return product
}

export function resolveDesktopChannel(value: string | undefined): DesktopChannel {
  if (value === "beta") return "beta"
  if (value === "prod" || value === "latest") return "prod"
  return "dev"
}

export function channelProduct(product: DesktopProduct, channel: DesktopChannel) {
  return product.channels[channel]
}
