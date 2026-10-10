import type { DesktopProduct } from "./product.ts"

export type RuntimeRestartReason = "login" | "logout" | "manual" | "recovery" | "update"
export type RuntimeStartReason = "startup" | RuntimeRestartReason

export type RuntimeConnection = {
  url: string
  username?: string | null
  password?: string | null
}

export type RuntimeProcess<C extends RuntimeConnection = RuntimeConnection> = {
  connection: C
  stop(): Promise<void>
}

export type RuntimeStatus<C extends RuntimeConnection = RuntimeConnection> =
  | { state: "idle"; generation: number }
  | { state: "starting"; generation: number; reason: RuntimeStartReason }
  | { state: "ready"; generation: number; connection: C }
  | { state: "stopping"; generation: number; reason: RuntimeRestartReason | "shutdown" }
  | { state: "failed"; generation: number; error: Error }

export type RuntimeStartContext = {
  product: DesktopProduct
  generation: number
  reason: RuntimeStartReason
  credential?: string
}

export type DesktopRuntime<C extends RuntimeConnection = RuntimeConnection> = {
  start(): Promise<C>
  restart(reason: RuntimeRestartReason): Promise<C>
  stop(): Promise<void>
  status(): RuntimeStatus<C>
  subscribe(listener: (status: RuntimeStatus<C>) => void): () => void
}

export function createDesktopRuntime<C extends RuntimeConnection>(options: {
  product: DesktopProduct
  credential?: () => Promise<string | undefined>
  start(context: RuntimeStartContext): Promise<RuntimeProcess<C>>
}): DesktopRuntime<C> {
  let process: RuntimeProcess<C> | undefined
  let generation = 0
  let current: RuntimeStatus<C> = { state: "idle", generation }
  let operation = Promise.resolve<unknown>(undefined)
  const listeners = new Set<(status: RuntimeStatus<C>) => void>()

  const publish = (status: RuntimeStatus<C>) => {
    current = status
    for (const listener of listeners) listener(status)
  }

  const enqueue = <T>(task: () => Promise<T>) => {
    const next = operation.then(task, task)
    operation = next.catch(() => undefined)
    return next
  }

  const launch = async (reason: RuntimeStartReason) => {
    generation += 1
    publish({ state: "starting", generation, reason })
    try {
      const next = await options.start({
        product: options.product,
        generation,
        reason,
        credential: await options.credential?.(),
      })
      process = next
      publish({ state: "ready", generation, connection: next.connection })
      return next.connection
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error))
      publish({ state: "failed", generation, error: failure })
      throw failure
    }
  }

  const halt = async (reason: RuntimeRestartReason | "shutdown") => {
    if (!process) return
    const active = process
    process = undefined
    publish({ state: "stopping", generation, reason })
    await active.stop()
    publish({ state: "idle", generation })
  }

  return {
    start: () =>
      enqueue(async () => {
        if (current.state === "ready") return current.connection
        return launch("startup")
      }),
    restart: (reason) =>
      enqueue(async () => {
        await halt(reason)
        return launch(reason)
      }),
    stop: () => enqueue(() => halt("shutdown")),
    status: () => current,
    subscribe(listener) {
      listeners.add(listener)
      listener(current)
      return () => listeners.delete(listener)
    },
  }
}

/** Explicit factory name used by product shells during runtime composition. */
export const createDesktopRuntimeFactory = createDesktopRuntime

export function createDeferredRestartCoordinator<R extends string>(options?: {
  onError?: (error: unknown, reason: R) => void
}) {
  let restart: ((reason: R) => Promise<void>) | undefined
  let pending: R | undefined
  let operation = Promise.resolve()

  const request = (reason: R) => {
    if (!restart) {
      pending = reason
      return
    }
    operation = operation
      .then(() => restart!(reason))
      .catch((error) => options?.onError?.(error, reason))
  }

  return {
    request,
    bind(handler: (reason: R) => Promise<void>) {
      restart = handler
      if (pending === undefined) return
      const reason = pending
      pending = undefined
      request(reason)
    },
    pending: () => pending,
    settled: () => operation,
  }
}
