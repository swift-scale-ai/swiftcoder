import path from "path"

process.env.SWIFTCODER_DB = ":memory:"
process.env.SWIFTCODER_MODELS_PATH = path.join(import.meta.dir, "plugin", "fixtures", "models-dev.json")
process.env.SWIFTCODER_DISABLE_MODELS_FETCH = "true"
