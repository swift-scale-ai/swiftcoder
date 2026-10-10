interface ImportMetaEnv {
  readonly SWIFTCODER_CHANNEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "virtual:swiftcoder-server" {
  export namespace Server {
    export const listen: typeof import("../../../agent/dist/types/src/node").Server.listen
    export type Listener = import("../../../agent/dist/types/src/node").Server.Listener
  }
  export namespace Config {
    export const get: typeof import("../../../agent/dist/types/src/node").Config.get
    export type Info = import("../../../agent/dist/types/src/node").Config.Info
  }
  export const bootstrap: typeof import("../../../agent/dist/types/src/node").bootstrap
}
