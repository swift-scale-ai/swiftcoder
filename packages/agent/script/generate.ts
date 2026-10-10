import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

const modelsUrl = process.env.SWIFTCODER_MODELS_URL || "https://models.dev"
const localSnapshot = path.resolve(dir, "resources/models-api.json")
const snapshotPath = process.env.MODELS_DEV_API_JSON || localSnapshot
export const modelsData = await Bun.file(snapshotPath)
  .text()
  .catch(() => fetch(`${modelsUrl}/api.json`).then((response) => response.text()))
console.log(`Loaded models.dev snapshot from ${snapshotPath}`)
