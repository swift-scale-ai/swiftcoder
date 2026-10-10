import { describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "node:path"
import { Database } from "bun:sqlite"
import { cliIt } from "../../lib/cli-process"
import { MessageID, PartID } from "../../../src/session/schema"

type Session = {
  id: string
  title: string
  metadata?: Record<string, unknown>
}

type Message = {
  info: { id: string; role: string; error?: { name?: string }; time: { completed?: number } }
  parts: Array<{ type: string; text?: string; state?: { status: string; metadata?: Record<string, unknown> } }>
}

const headers = (directory: string) => ({
  "content-type": "application/json",
  "x-swiftcoder-directory": directory,
})

describe("swiftcoder serve session recovery (subprocess)", () => {
  cliIt.live(
    "reads the same durable session after the Agent Server restarts",
    ({ home, swiftcoder }) =>
      Effect.gen(function* () {
        const serveOptions = { env: { SWIFTCODER_DB: path.join(home, "phase2-sessions.db") } }
        const first = yield* swiftcoder.serve(serveOptions)
        const created = yield* Effect.promise(() =>
          fetch(`${first.url}/session`, {
            method: "POST",
            headers: headers(home),
            body: JSON.stringify({
              title: "phase2-restart-recovery",
              metadata: { task: { status: "running", checkpoint: "tools-complete" } },
            }),
          }),
        )
        expect(created.status).toBe(200)
        const session = (yield* Effect.promise(() => created.json())) as Session

        first.kill()
        yield* Effect.promise(() => first.exited)

        const restarted = yield* swiftcoder.serve(serveOptions)
        const fetched = yield* Effect.promise(() =>
          fetch(`${restarted.url}/session/${session.id}`, {
            headers: headers(home),
          }),
        )
        expect(fetched.status).toBe(200)
        expect((yield* Effect.promise(() => fetched.json())) as Session).toMatchObject({
          id: session.id,
          title: "phase2-restart-recovery",
          metadata: { task: { status: "running", checkpoint: "tools-complete" } },
        })
      }),
    90_000,
  )

  cliIt.live(
    "reconciles a durable interrupted checkpoint after restart without replaying tools",
    ({ home, swiftcoder }) =>
      Effect.gen(function* () {
        const databasePath = path.join(home, "phase2-interrupted.db")
        const serveOptions = { env: { SWIFTCODER_DB: databasePath } }
        const first = yield* swiftcoder.serve(serveOptions)
        const created = yield* Effect.promise(() =>
          fetch(`${first.url}/session`, {
            method: "POST",
            headers: headers(home),
            body: JSON.stringify({ title: "phase2-interrupted-checkpoint" }),
          }),
        )
        expect(created.status).toBe(200)
        const session = (yield* Effect.promise(() => created.json())) as Session

        first.kill()
        yield* Effect.promise(() => first.exited)

        const userID = MessageID.ascending()
        const assistantID = MessageID.ascending()
        const now = Date.now()
        const db = new Database(databasePath)
        db.run("PRAGMA foreign_keys = ON")
        db.run("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)", [
          userID,
          session.id,
          now,
          now,
          JSON.stringify({ role: "user", agent: "build", model: { providerID: "swiftcoder", modelID: "swiftscale" }, time: { created: now } }),
        ])
        db.run("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)", [
          assistantID,
          session.id,
          now + 1,
          now + 1,
          JSON.stringify({
            role: "assistant",
            parentID: userID,
            mode: "build",
            agent: "build",
            cost: 0,
            path: { cwd: home, root: home },
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            modelID: "swiftscale",
            providerID: "swiftcoder",
            time: { created: now + 1 },
          }),
        ])
        db.run("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?, ?)", [
          PartID.ascending(),
          assistantID,
          session.id,
          now + 2,
          now + 2,
          JSON.stringify({ type: "text", text: "partial output" }),
        ])
        db.run("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?, ?)", [
          PartID.ascending(),
          assistantID,
          session.id,
          now + 3,
          now + 3,
          JSON.stringify({
            type: "tool",
            tool: "bash",
            callID: "call_before_restart",
            state: {
              status: "running",
              input: { command: "build" },
              time: { start: now + 3 },
              metadata: { output: "started" },
            },
          }),
        ])
        db.close()

        const restarted = yield* swiftcoder.serve(serveOptions)
        const response = yield* Effect.promise(() =>
          fetch(`${restarted.url}/session/${session.id}/message`, { headers: headers(home) }),
        )
        expect(response.status).toBe(200)
        const messages = (yield* Effect.promise(() => response.json())) as Message[]
        const assistant = messages.find((message) => message.info.id === assistantID)
        expect(assistant?.info.error?.name).toBe("MessageAbortedError")
        expect(assistant?.info.time.completed).toBeNumber()
        expect(assistant?.parts.some((part) => part.type === "text" && part.text === "partial output")).toBe(true)
        const tool = assistant?.parts.find((part) => part.type === "tool")
        expect(tool?.state?.status).toBe("error")
        expect(tool?.state?.metadata?.interrupted).toBe(true)
        expect(tool?.state?.metadata?.output).toBe("started")

        const repeated = yield* Effect.promise(() =>
          fetch(`${restarted.url}/session/${session.id}/message`, { headers: headers(home) }),
        )
        const repeatedMessages = (yield* Effect.promise(() => repeated.json())) as Message[]
        const repeatedAssistant = repeatedMessages.find((message) => message.info.id === assistantID)
        expect(repeatedAssistant).toEqual(assistant)
      }),
    90_000,
  )
})
