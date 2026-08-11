import type { ProductMetric } from "../preload/types"

export type AnalyticsEvent = { name: ProductMetric | "app.opened"; occurredAt: string }

type AnalyticsStore = {
  get(key: string): unknown
  set(key: string, value: unknown): void
  delete(key: string): void
}

type Input = {
  store: AnalyticsStore
  fetch?: typeof fetch
  endpoint?: string
  uploadAllowed: boolean
}

const queueKey = "queue"
const enabledKey = "enabled"
const maxQueue = 100

const isEvent = (value: unknown): value is AnalyticsEvent => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).length === 2 &&
    typeof record.name === "string" &&
    typeof record.occurredAt === "string" &&
    Number.isFinite(Date.parse(record.occurredAt))
  )
}

export function createProductAnalytics(input: Input) {
  const request = input.fetch ?? fetch
  const endpoint = input.endpoint ?? "https://api.swift-scale.com/v1/telemetry/events"
  let flushing: Promise<void> | undefined
  const enabled = () => input.store.get(enabledKey) === true
  const readQueue = () => {
    const value = input.store.get(queueKey)
    if (!Array.isArray(value)) return []
    return value.filter(isEvent).slice(-maxQueue)
  }
  const writeQueue = (events: AnalyticsEvent[]) => {
    if (events.length === 0) return input.store.delete(queueKey)
    input.store.set(queueKey, events.slice(-maxQueue))
  }
  const flush = () => {
    if (!enabled() || !input.uploadAllowed || flushing) return flushing ?? Promise.resolve()
    const events = readQueue()
    if (events.length === 0) return Promise.resolve()
    flushing = request(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-swiftcoder-client": "desktop" },
      body: JSON.stringify({ schema: 1, events }),
      signal: AbortSignal.timeout(10_000),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Analytics upload failed (${response.status})`)
        writeQueue(readQueue().slice(events.length))
      })
      .finally(() => {
        flushing = undefined
      })
    return flushing
  }

  return {
    enabled,
    setEnabled(value: boolean) {
      input.store.set(enabledKey, value)
      if (!value) {
        writeQueue([])
        return Promise.resolve()
      }
      return flush()
    },
    record(name: AnalyticsEvent["name"]) {
      if (!enabled()) return
      writeQueue([...readQueue(), { name, occurredAt: new Date().toISOString() }])
      void flush().catch(() => undefined)
    },
    flush,
  }
}
