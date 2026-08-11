export * as Credential from "./credential"

import { asc, eq } from "drizzle-orm"
import { Context, Effect, Layer, Ref, Schema } from "effect"
import { Credential } from "@opencode-ai/schema/credential"
import { Integration } from "@opencode-ai/schema/integration"
import { Database } from "./database/database"
import { makeGlobalNode } from "./effect/app-node"
import { CredentialTable } from "./credential/sql"
import * as MacOSKeychain from "./credential/macos-keychain"

export const ID = Credential.ID
export type ID = Credential.ID

export const OAuth = Credential.OAuth
export type OAuth = Credential.OAuth

export const Key = Credential.Key
export type Key = Credential.Key

export const Value = Credential.Value
export type Value = Credential.Value

export class Info extends Schema.Class<Info>("Credential.Info")({
  id: ID,
  integrationID: Integration.ID,
  label: Schema.String,
  value: Value,
}) {}

export interface Interface {
  /** Returns every stored credential. */
  readonly all: () => Effect.Effect<Info[]>
  /** Returns stored credentials belonging to one integration. */
  readonly list: (integrationID: Integration.ID) => Effect.Effect<Info[]>
  /** Returns one stored credential by ID. */
  readonly get: (id: ID) => Effect.Effect<Info | undefined>
  /** Replaces any credential for an integration and returns the new record. */
  readonly create: (input: {
    readonly integrationID: Integration.ID
    readonly value: Value
    readonly label?: string
  }) => Effect.Effect<Info>
  /** Updates the label or secret value of a stored credential. */
  readonly update: (id: ID, updates: Partial<Pick<Info, "label" | "value">>) => Effect.Effect<void>
  /** Removes a stored credential. */
  readonly remove: (id: ID) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@swiftcoder/v2/Credential") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const { db } = yield* Database.Service
    const decode = Schema.decodeUnknownSync(Value)
    const swiftcoderID = Integration.ID.make("swiftcoder")
    const secureKey = yield* Ref.make(yield* Effect.promise(MacOSKeychain.read).pipe(Effect.orDie))
    const secure = (integrationID: Integration.ID, value: Value): value is Key =>
      MacOSKeychain.enabled() && integrationID === swiftcoderID && value.type === "key"
    const removeSecureKey = Effect.promise(MacOSKeychain.remove).pipe(
      Effect.andThen(Ref.set(secureKey, undefined)),
      Effect.orDie,
    )
    const persist = Effect.fn("Credential.persistValue")(function* (integrationID: Integration.ID, value: Value) {
      if (!secure(integrationID, value)) return value
      yield* Effect.promise(() => MacOSKeychain.write(value.key)).pipe(Effect.orDie)
      yield* Ref.set(secureKey, value.key)
      return Key.make({ ...value, key: MacOSKeychain.reference })
    })
    const stored = Effect.fn("Credential.materialize")(function* (row: typeof CredentialTable.$inferSelect) {
      if (!row.integration_id) return
      const value = decode(row.value)
      if (secure(row.integration_id, value) && value.key === MacOSKeychain.reference) {
        const key = yield* Ref.get(secureKey)
        if (!key) return
        return new Info({
          id: row.id,
          integrationID: row.integration_id,
          label: row.label,
          value: Key.make({ ...value, key }),
        })
      }
      return new Info({
        id: row.id,
        integrationID: row.integration_id,
        label: row.label,
        value,
      })
    })

    if (MacOSKeychain.enabled()) {
      const row = yield* db
        .select()
        .from(CredentialTable)
        .where(eq(CredentialTable.integration_id, swiftcoderID))
        .get()
        .pipe(Effect.orDie)
      if (row) {
        const value = decode(row.value)
        if (value.type === "key" && value.key !== MacOSKeychain.reference) {
          const persisted = yield* persist(swiftcoderID, value)
          yield* db
            .update(CredentialTable)
            .set({ value: persisted })
            .where(eq(CredentialTable.id, row.id))
            .run()
            .pipe(Effect.orDie)
        }
      }
    }

    return Service.of({
      all: Effect.fn("Credential.all")(function* () {
        const rows = yield* db
          .select()
          .from(CredentialTable)
          .orderBy(asc(CredentialTable.time_created))
          .all()
          .pipe(Effect.orDie)
        return (yield* Effect.forEach(rows, stored)).filter((item): item is Info => item !== undefined)
      }),
      list: Effect.fn("Credential.list")(function* (integrationID) {
        const rows = yield* db
          .select()
          .from(CredentialTable)
          .where(eq(CredentialTable.integration_id, integrationID))
          .orderBy(asc(CredentialTable.time_created))
          .all()
          .pipe(Effect.orDie)
        return (yield* Effect.forEach(rows, stored)).filter((item): item is Info => item !== undefined)
      }),
      get: Effect.fn("Credential.get")(function* (id) {
        const row = yield* db.select().from(CredentialTable).where(eq(CredentialTable.id, id)).get().pipe(Effect.orDie)
        return row ? yield* stored(row) : undefined
      }),
      create: Effect.fn("Credential.create")(function* (input) {
        const credential = new Info({
          id: ID.create(),
          integrationID: input.integrationID,
          label: input.label ?? "default",
          value: input.value,
        })
        const value = yield* persist(credential.integrationID, credential.value)
        if (credential.integrationID === swiftcoderID && credential.value.type !== "key") yield* removeSecureKey
        yield* db
          .transaction((tx) =>
            Effect.gen(function* () {
              yield* tx
                .delete(CredentialTable)
                .where(eq(CredentialTable.integration_id, credential.integrationID))
                .run()
              yield* tx
                .insert(CredentialTable)
                .values({
                  id: credential.id,
                  integration_id: credential.integrationID,
                  label: credential.label,
                  value,
                })
                .run()
            }),
          )
          .pipe(Effect.orDie)
        return credential
      }),
      update: Effect.fn("Credential.update")(function* (id, updates) {
        if (!updates.label && !updates.value) return
        const current = yield* db
          .select()
          .from(CredentialTable)
          .where(eq(CredentialTable.id, id))
          .get()
          .pipe(Effect.orDie)
        const value = current && updates.value ? yield* persist(current.integration_id!, updates.value) : updates.value
        if (current?.integration_id === swiftcoderID && updates.value && updates.value.type !== "key") {
          yield* removeSecureKey
        }
        yield* db
          .update(CredentialTable)
          .set({ label: updates.label, value })
          .where(eq(CredentialTable.id, id))
          .run()
          .pipe(Effect.orDie)
      }),
      remove: Effect.fn("Credential.remove")(function* (id) {
        const current = yield* db
          .select()
          .from(CredentialTable)
          .where(eq(CredentialTable.id, id))
          .get()
          .pipe(Effect.orDie)
        yield* db.delete(CredentialTable).where(eq(CredentialTable.id, id)).run().pipe(Effect.orDie)
        if (current?.integration_id === swiftcoderID) yield* removeSecureKey
      }),
    })
  }),
)

export const node = makeGlobalNode({ service: Service, layer, deps: [Database.node] })
