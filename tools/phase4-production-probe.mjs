import { pathToFileURL } from "node:url"

const json = async (response, name) => {
  const type = response.headers.get("content-type") ?? ""
  if (!type.includes("application/json")) throw new Error(`${name}: expected JSON, received ${type || "unknown"}`)
  return response.json()
}

const requireRequestID = (response, name) => {
  const value = response.headers.get("x-request-id") ?? response.headers.get("x-swiftscale-request-id")
  if (!value) throw new Error(`${name}: missing request id header`)
}

const check = async (input, name, url, init, validate) => {
  const started = performance.now()
  const response = await input.fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000), ...init })
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status} at ${url}`)
  await validate?.(response)
  return { name, status: response.status, durationMs: Math.round(performance.now() - started), url }
}

export async function runPhase4ProductionProbe(input) {
  const origin = (input.webOrigin ?? "https://swift-scale.com").replace(/\/$/, "")
  const api = (input.apiOrigin ?? "https://api.swift-scale.com").replace(/\/$/, "")
  const account = (input.accountOrigin ?? "https://admin-api.swift-scale.com").replace(/\/$/, "")
  const channel = input.channel ?? "beta"
  const checks = []
  checks.push(await check(input, "SwiftCoder product", `${origin}/swiftcoder/`))
  checks.push(await check(input, "Desktop authorization", `${origin}/swiftcoder/authorize/`))
  checks.push(await check(input, "Coding Plan", `${origin}/coding-plan/`))
  checks.push(await check(input, "Billing console", `${origin}/console/?service=coding_plan&view=billing`))
  checks.push(await check(input, "Support", `${origin}/contact/?product=swiftcoder`))
  checks.push(
    await check(
      input,
      "Admin CORS",
      `${account}/v1/auth/desktop/authorize`,
      {
        method: "OPTIONS",
        headers: {
          origin,
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type",
        },
      },
      async (response) => {
        if (response.headers.get("access-control-allow-origin") !== origin) {
          throw new Error(`Admin CORS: ${origin} is not allowed`)
        }
        if (!(response.headers.get("access-control-allow-methods") ?? "").includes("POST")) {
          throw new Error("Admin CORS: POST is not allowed")
        }
      },
    ),
  )

  if (input.publicOnly !== true) {
    if (!input.accessToken) throw new Error("SWIFTCODER_PROBE_ACCESS_TOKEN is required for authenticated checks")
    const headers = { authorization: `Bearer ${input.accessToken}`, accept: "application/json" }
    checks.push(
      await check(input, "Entitlements", `${account}/v1/account/entitlements`, { headers }, async (response) => {
        requireRequestID(response, "Entitlements")
        const body = await json(response, "Entitlements")
        if (!["free", "lite", "pro"].includes(body.tier)) throw new Error("Entitlements: invalid tier")
        if (!["coding", "api_services"].includes(body.product)) throw new Error("Entitlements: invalid product")
        if (!body.usage || !body.limits || !body.service) throw new Error("Entitlements: incomplete response")
      }),
    )
    checks.push(
      await check(input, "Models", `${api}/v1/models`, { headers }, async (response) => {
        requireRequestID(response, "Models")
        const body = await json(response, "Models")
        if (!Array.isArray(body.data) || body.data.length === 0) throw new Error("Models: empty catalog")
      }),
    )
  }

  if (input.telemetryWrite === true) {
    checks.push(
      await check(
        input,
        "Telemetry",
        `${api}/v1/telemetry/events`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-swiftcoder-client": "production-probe" },
          body: JSON.stringify({
            schema: 1,
            events: [{ name: "app.opened", occurredAt: new Date().toISOString() }],
          }),
        },
        (response) => requireRequestID(response, "Telemetry"),
      ),
    )
  }

  checks.push(
    await check(input, "Update feed", `${origin}/swiftcoder/releases/${channel}/latest-mac.yml`, undefined, async (r) => {
      const body = await r.text()
      if (!/^version:\s*\S+/m.test(body) || !/^sha512:\s*\S+/m.test(body)) {
        throw new Error("Update feed: missing version or sha512")
      }
    }),
  )
  return { checkedAt: new Date().toISOString(), channel, checks }
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const result = await runPhase4ProductionProbe({
    fetch,
    accessToken: process.env.SWIFTCODER_PROBE_ACCESS_TOKEN,
    webOrigin: process.env.SWIFTCODER_WEB_ORIGIN,
    apiOrigin: process.env.SWIFTCODER_API_ORIGIN,
    accountOrigin: process.env.SWIFTCODER_ACCOUNT_ORIGIN,
    channel: process.env.SWIFTCODER_CHANNEL,
    publicOnly: args.has("--public-only"),
    telemetryWrite: args.has("--write-telemetry"),
  })
  console.log(JSON.stringify(result, null, 2))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
