import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import path from "path"
import { Effect, Layer, Record, Result, Schema, Context } from "effect"
import { NonNegativeInt } from "@opencode-ai/core/schema"
import { Global } from "@opencode-ai/core/global"
import { FSUtil } from "@opencode-ai/core/fs-util"
import * as MacOSKeychain from "./macos-keychain"

export const OAUTH_DUMMY_KEY = "swiftcoder-oauth-dummy-key"

const file = path.join(Global.Path.data, "auth.json")

const fail = (message: string) => (cause: unknown) => new AuthError({ message, cause })

export class Oauth extends Schema.Class<Oauth>("OAuth")({
  type: Schema.Literal("oauth"),
  refresh: Schema.String,
  access: Schema.String,
  expires: NonNegativeInt,
  accountId: Schema.optional(Schema.String),
  enterpriseUrl: Schema.optional(Schema.String),
}) {}

export class Api extends Schema.Class<Api>("ApiAuth")({
  type: Schema.Literal("api"),
  key: Schema.String,
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}) {}

export class WellKnown extends Schema.Class<WellKnown>("WellKnownAuth")({
  type: Schema.Literal("wellknown"),
  key: Schema.String,
  token: Schema.String,
}) {}

export const Info = Schema.Union([Oauth, Api, WellKnown]).annotate({ discriminator: "type", identifier: "Auth" })
export type Info = Schema.Schema.Type<typeof Info>

export class AuthError extends Schema.TaggedErrorClass<AuthError>()("AuthError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect()),
}) {}

export interface Interface {
  readonly get: (providerID: string) => Effect.Effect<Info | undefined, AuthError>
  readonly all: () => Effect.Effect<Record<string, Info>, AuthError>
  readonly set: (key: string, info: Info) => Effect.Effect<void, AuthError>
  readonly remove: (key: string) => Effect.Effect<void, AuthError>
}

export class Service extends Context.Service<Service, Interface>()("@swiftcoder/Auth") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fsys = yield* FSUtil.Service
    const decode = Schema.decodeUnknownOption(Info)

    const persisted = Effect.fn("Auth.persisted")(function* () {
      return (yield* fsys.readJson(file).pipe(Effect.orElseSucceed(() => ({})))) as Record<string, unknown>
    })

    const injected = () => {
      if (!process.env.SWIFTCODER_AUTH_CONTENT) return {} as Record<string, unknown>
      try {
        return JSON.parse(process.env.SWIFTCODER_AUTH_CONTENT) as Record<string, unknown>
      } catch {
        return {} as Record<string, unknown>
      }
    }

    const all = Effect.fn("Auth.all")(function* () {
      const data = { ...(yield* persisted()), ...injected() }
      if (MacOSKeychain.enabled()) {
        const secure = yield* Effect.promise(() => MacOSKeychain.read()).pipe(
          Effect.mapError(fail("Failed to read credentials from macOS Keychain")),
        )
        if (secure) data.swiftcoder = secure
        else delete data.swiftcoder
      }
      return Record.filterMap(data, (value) => Result.fromOption(decode(value), () => undefined))
    })

    const get = Effect.fn("Auth.get")(function* (providerID: string) {
      return (yield* all())[providerID]
    })

    const set = Effect.fn("Auth.set")(function* (key: string, info: Info) {
      const norm = key.replace(/\/+$/, "")
      if (norm === "swiftcoder" && MacOSKeychain.enabled()) {
        yield* Effect.promise(() => MacOSKeychain.write(info)).pipe(
          Effect.mapError(fail("Failed to write credentials to macOS Keychain")),
        )
        return
      }
      const data = yield* persisted()
      if (norm !== key) delete data[key]
      delete data[norm + "/"]
      yield* fsys
        .writeJson(file, { ...data, [norm]: info }, 0o600)
        .pipe(Effect.mapError(fail("Failed to write auth data")))
    })

    const remove = Effect.fn("Auth.remove")(function* (key: string) {
      const norm = key.replace(/\/+$/, "")
      if (norm === "swiftcoder" && MacOSKeychain.enabled()) {
        yield* Effect.promise(() => MacOSKeychain.remove()).pipe(
          Effect.mapError(fail("Failed to remove credentials from macOS Keychain")),
        )
        return
      }
      const data = yield* persisted()
      delete data[key]
      delete data[norm]
      yield* fsys.writeJson(file, data, 0o600).pipe(Effect.mapError(fail("Failed to write auth data")))
    })

    return Service.of({ get, all, set, remove })
  }),
)

export const node = LayerNode.make({ service: Service, layer: layer, deps: [FSUtil.node] })

export * as Auth from "."
