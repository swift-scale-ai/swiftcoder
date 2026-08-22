import { expect, test } from "bun:test"
import path from "path"

test("Swift models advertise the authoritative input and output limits", async () => {
  const catalog = await Bun.file(path.join(import.meta.dir, "../../resources/models-api.json")).json()
  const models = catalog.swiftcoder.models
  const limits = {
    "swift.auto": { context: 1_032_000, input: 1_000_000, output: 32_000 },
    "swiftlite.auto": { context: 1_016_000, input: 1_000_000, output: 16_000 },
    "swiftpro.auto": { context: 1_032_000, input: 1_000_000, output: 32_000 },
    "swiftreason.auto": { context: 1_064_000, input: 1_000_000, output: 64_000 },
    "swiftagent.auto": { context: 1_064_000, input: 1_000_000, output: 64_000 },
    "swiftmaxflash.auto": { context: 1_050_000, input: 922_000, output: 128_000 },
    "swiftmax.auto": { context: 1_050_000, input: 922_000, output: 128_000 },
  }

  for (const [id, limit] of Object.entries(limits)) expect(models[id].limit).toEqual(limit)
})
