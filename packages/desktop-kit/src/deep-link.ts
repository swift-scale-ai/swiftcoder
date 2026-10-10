export type DeepLinkHandler = (urls: string[]) => boolean | Promise<boolean>
export type DeepLinkSink = (urls: string[]) => void

export type DeepLinkRouter = {
  accepts(value: string): boolean
  receive(urls: string[]): Promise<string[]>
  registerHandler(handler: DeepLinkHandler): () => void
  setSink(sink: DeepLinkSink | undefined): void
  consumePending(): string[]
}

export function createDeepLinkRouter(protocol: string): DeepLinkRouter {
  const scheme = `${protocol.toLowerCase()}:`
  const handlers = new Set<DeepLinkHandler>()
  const pending: string[] = []
  let sink: DeepLinkSink | undefined

  const accepts = (value: string) => {
    try {
      return new URL(value).protocol.toLowerCase() === scheme
    } catch {
      return false
    }
  }

  return {
    accepts,
    async receive(values) {
      const urls = values.filter(accepts)
      if (!urls.length) return []

      let remaining = urls
      for (const handler of handlers) {
        if (!remaining.length) break
        if (await handler(remaining)) remaining = []
      }
      if (!remaining.length) return []
      if (sink) sink(remaining)
      else pending.push(...remaining)
      return remaining
    },
    registerHandler(handler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    setSink(next) {
      sink = next
      if (!sink || !pending.length) return
      sink(pending.splice(0))
    },
    consumePending() {
      return pending.splice(0)
    },
  }
}
