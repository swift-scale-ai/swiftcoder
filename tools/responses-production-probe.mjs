import { pathToFileURL } from "node:url"

const requestID = (response) =>
  response.headers.get("x-swiftscale-request-id") ?? response.headers.get("x-request-id")

const json = async (response, name) => {
  const body = await response.json().catch(() => undefined)
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}${body?.error?.message ? `: ${body.error.message}` : ""}`)
  return body
}

async function readSSE(response, timeoutMs) {
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Responses stream: HTTP ${response.status}: ${body.slice(0, 500)}`)
  }
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("Responses stream: expected text/event-stream")
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error("Responses stream: response body is missing")
  const decoder = new TextDecoder()
  let body = ""
  const deadline = Date.now() + timeoutMs
  while (true) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw new Error("Responses stream: timed out")
    let timer
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Responses stream: timed out")), remaining)
    })
    const part = await Promise.race([reader.read(), timeout]).finally(() => clearTimeout(timer))
    if (part.done) break
    body += decoder.decode(part.value, { stream: true })
    if (body.length > 2 * 1024 * 1024) throw new Error("Responses stream: exceeded probe response limit")
  }
  body += decoder.decode()
  return body
}

export async function runResponsesProductionProbe(input) {
  if (!input.accessToken) throw new Error("SWIFTCODER_PROBE_ACCESS_TOKEN is required")
  const api = (input.apiOrigin ?? "https://api.swift-scale.com").replace(/\/$/, "")
  const timeoutMs = input.timeoutMs ?? 180_000
  const headers = { authorization: `Bearer ${input.accessToken}`, accept: "application/json" }
  const modelsResponse = await input.fetch(`${api}/v1/models`, {
    headers,
    signal: AbortSignal.timeout(Math.min(timeoutMs, 30_000)),
  })
  const models = await json(modelsResponse, "Models")
  const model = input.model ?? models?.data?.[0]?.id
  if (typeof model !== "string" || !model) throw new Error("Models: no selectable model")

  const started = performance.now()
  const response = await input.fetch(`${api}/v1/responses`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json", "x-swiftcoder-client": "responses-production-probe" },
    body: JSON.stringify({
      model,
      input: "Reply with exactly: SwiftCoder production stream ready",
      stream: true,
      max_output_tokens: 64,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const trace = requestID(response)
  if (!trace) throw new Error("Responses stream: missing request id")
  const body = await readSSE(response, timeoutMs)
  if (!body.includes("response.output_text.delta")) throw new Error("Responses stream: no output_text delta event")
  if (!body.includes("response.completed")) throw new Error("Responses stream: no completed event")

  return {
    checkedAt: new Date().toISOString(),
    model,
    requestID: trace,
    durationMs: Math.round(performance.now() - started),
    streamed: true,
  }
}

async function main() {
  const result = await runResponsesProductionProbe({
    fetch,
    accessToken: process.env.SWIFTCODER_PROBE_ACCESS_TOKEN,
    apiOrigin: process.env.SWIFTCODER_API_ORIGIN,
    model: process.env.SWIFTCODER_PROBE_MODEL,
  })
  console.log(JSON.stringify(result, null, 2))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
