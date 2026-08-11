export * from "./client.js"
export * from "./server.js"

import { createSwiftCoderClient } from "./client.js"
import { createSwiftCoderServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export * as data from "./data.js"

export async function createSwiftCoder(options?: ServerOptions) {
  const server = await createSwiftCoderServer({
    ...options,
  })

  const client = createSwiftCoderClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
