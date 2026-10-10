import type { ElectronAPI } from "../preload/types"

interface ImportMetaEnv {
  readonly SWIFTCODER_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    api: ElectronAPI
    __SWIFTCODER__?: {
      deepLinks?: string[]
    }
  }
}
