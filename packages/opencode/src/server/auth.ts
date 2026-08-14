export * as ServerAuth from "./auth"

import { ConfigService } from "@/effect/config-service"
import { Flag } from "@swiftscale/core/flag/flag"
import { Config as EffectConfig, Context, Option, Redacted } from "effect"

export type Credentials = {
  password?: string
  username?: string
}

export type DecodedCredentials = {
  readonly username: string
  readonly password: Redacted.Redacted
}

export class Config extends ConfigService.Service<Config>()("@swiftcoder/ServerAuthConfig", {
  password: EffectConfig.string("SWIFTCODER_SERVER_PASSWORD").pipe(EffectConfig.option),
  username: EffectConfig.string("SWIFTCODER_SERVER_USERNAME").pipe(EffectConfig.withDefault("swiftcoder")),
}) {}

export type Info = Context.Service.Shape<typeof Config>

export function required(config: Info) {
  return Option.isSome(config.password) && config.password.value !== ""
}

export function authorized(credentials: DecodedCredentials, config: Info) {
  return (
    Option.isSome(config.password) &&
    credentials.username === config.username &&
    Redacted.value(credentials.password) === config.password.value
  )
}

export function header(credentials?: Credentials) {
  const password = credentials?.password ?? Flag.SWIFTCODER_SERVER_PASSWORD
  if (!password) return undefined

  const username = credentials?.username ?? Flag.SWIFTCODER_SERVER_USERNAME ?? "swiftcoder"
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
}

export function headers(credentials?: Credentials) {
  const authorization = header(credentials)
  if (!authorization) return undefined
  return { Authorization: authorization }
}
