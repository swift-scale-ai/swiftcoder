export type DesktopUpdateStatus =
  | { state: "disabled"; reason: string }
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; version: string }
  | { state: "downloading"; version: string; percent?: number }
  | { state: "ready"; version: string }
  | { state: "current" }
  | { state: "error"; message: string }

export type DesktopUpdateEvent =
  | { type: "checking" }
  | { type: "available"; version: string }
  | { type: "not-available" }
  | { type: "progress"; version: string; percent?: number }
  | { type: "downloaded"; version: string }
  | { type: "error"; error: unknown }

export type DesktopUpdateAdapter = {
  check(): Promise<void>
  download(): Promise<void>
  install(): void
  subscribe(listener: (event: DesktopUpdateEvent) => void): () => void
}

export type DesktopUpdater = {
  check(): Promise<DesktopUpdateStatus>
  download(): Promise<DesktopUpdateStatus>
  install(): void
  status(): DesktopUpdateStatus
  subscribe(listener: (status: DesktopUpdateStatus) => void): () => void
  dispose(): void
}

export function createDesktopUpdater(options: {
  enabled: boolean
  disabledReason?: string
  adapter: DesktopUpdateAdapter
}): DesktopUpdater {
  let current: DesktopUpdateStatus = options.enabled
    ? { state: "idle" }
    : { state: "disabled", reason: options.disabledReason ?? "Updates are disabled" }
  const listeners = new Set<(status: DesktopUpdateStatus) => void>()
  let operation = Promise.resolve<unknown>(undefined)

  const publish = (status: DesktopUpdateStatus) => {
    current = status
    for (const listener of listeners) listener(status)
  }
  const unsubscribe = options.adapter.subscribe((event) => {
    if (!options.enabled) return
    if (event.type === "checking") publish({ state: "checking" })
    if (event.type === "available") publish({ state: "available", version: event.version })
    if (event.type === "not-available") publish({ state: "current" })
    if (event.type === "progress") {
      publish({ state: "downloading", version: event.version, percent: event.percent })
    }
    if (event.type === "downloaded") publish({ state: "ready", version: event.version })
    if (event.type === "error") {
      publish({ state: "error", message: event.error instanceof Error ? event.error.message : String(event.error) })
    }
  })
  const enqueue = (task: () => Promise<void>) => {
    const next = operation.then(task, task)
    operation = next.catch(() => undefined)
    return next
  }

  return {
    async check() {
      if (!options.enabled) return current
      await enqueue(() => options.adapter.check())
      return current
    },
    async download() {
      if (!options.enabled) return current
      await enqueue(() => options.adapter.download())
      return current
    },
    install() {
      if (current.state === "ready") options.adapter.install()
    },
    status: () => current,
    subscribe(listener) {
      listeners.add(listener)
      listener(current)
      return () => listeners.delete(listener)
    },
    dispose() {
      unsubscribe()
      listeners.clear()
    },
  }
}
