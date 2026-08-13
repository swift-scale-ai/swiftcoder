import { describe, expect, test } from "bun:test"
import {
  collectBillingCallbackDeepLinks,
  collectNewSessionDeepLinks,
  collectOpenProjectDeepLinks,
  drainPendingDeepLinks,
  parseBillingCallbackDeepLink,
  parseDeepLink,
  parseNewSessionDeepLink,
} from "./deep-links"
import { type Session } from "@opencode-ai/sdk/v2/client"
import {
  childSessionOnPath,
  closeHomeProject,
  compareSessionTime,
  displayName,
  effectiveWorkspaceOrder,
  errorMessage,
  firstUserMessageText,
  belongsToChat,
  belongsToProject,
  hasProjectPermissions,
  homeProjectNavigation,
  homeProjectDirectories,
  homeSessionServerStatus,
  latestRootSession,
  numberedDefaultSessionTitle,
  placedChatSessions,
  formatRecentSessionTime,
  recentRootSessions,
  sortedRootSessions,
  toggleHomeProjectSelection,
} from "./helpers"
import { pathKey } from "@/utils/path-key"
import { ServerConnection } from "@/context/server"

const serverKey = ServerConnection.Key.make

const session = (input: Partial<Session> & Pick<Session, "id" | "directory">) =>
  ({
    title: "",
    version: "v2",
    parentID: undefined,
    messageCount: 0,
    permissions: { session: {}, share: {} },
    time: { created: 0, updated: 0, archived: undefined },
    ...input,
  }) as Session

describe("layout deep links", () => {
  test("accepts only the fixed billing completion callback", () => {
    expect(parseBillingCallbackDeepLink("swiftcoder://billing/complete?result=success")).toEqual({ result: "success" })
    expect(parseBillingCallbackDeepLink("swiftcoder://billing/complete?result=cancel")).toEqual({ result: "cancel" })
    expect(parseBillingCallbackDeepLink("swiftcoder://billing/complete?result=success&token=secret")).toBeUndefined()
    expect(parseBillingCallbackDeepLink("swiftcoder://billing/other?result=success")).toBeUndefined()
    expect(parseBillingCallbackDeepLink("https://billing/complete?result=success")).toBeUndefined()
    expect(
      collectBillingCallbackDeepLinks([
        "swiftcoder://billing/complete?result=success",
        "swiftcoder://billing/complete?result=unknown",
      ]),
    ).toEqual([{ result: "success" }])
  })

  test("parses open-project deep links", () => {
    expect(parseDeepLink("swiftcoder://open-project?directory=/tmp/demo")).toBe("/tmp/demo")
  })

  test("ignores non-project deep links", () => {
    expect(parseDeepLink("swiftcoder://other?directory=/tmp/demo")).toBeUndefined()
    expect(parseDeepLink("https://example.com")).toBeUndefined()
  })

  test("ignores malformed deep links safely", () => {
    expect(() => parseDeepLink("swiftcoder://open-project/%E0%A4%A%")).not.toThrow()
    expect(parseDeepLink("swiftcoder://open-project/%E0%A4%A%")).toBeUndefined()
  })

  test("parses links when URL.canParse is unavailable", () => {
    const original = Object.getOwnPropertyDescriptor(URL, "canParse")
    Object.defineProperty(URL, "canParse", { configurable: true, value: undefined })
    try {
      expect(parseDeepLink("swiftcoder://open-project?directory=/tmp/demo")).toBe("/tmp/demo")
    } finally {
      if (original) Object.defineProperty(URL, "canParse", original)
      if (!original) Reflect.deleteProperty(URL, "canParse")
    }
  })

  test("ignores open-project deep links without directory", () => {
    expect(parseDeepLink("swiftcoder://open-project")).toBeUndefined()
    expect(parseDeepLink("swiftcoder://open-project?directory=")).toBeUndefined()
  })

  test("collects only valid open-project directories", () => {
    const result = collectOpenProjectDeepLinks([
      "swiftcoder://open-project?directory=/a",
      "swiftcoder://other?directory=/b",
      "swiftcoder://open-project?directory=/c",
    ])
    expect(result).toEqual(["/a", "/c"])
  })

  test("parses new-session deep links with optional prompt", () => {
    expect(parseNewSessionDeepLink("swiftcoder://new-session?directory=/tmp/demo")).toEqual({ directory: "/tmp/demo" })
    expect(parseNewSessionDeepLink("swiftcoder://new-session?directory=/tmp/demo&prompt=hello%20world")).toEqual({
      directory: "/tmp/demo",
      prompt: "hello world",
    })
  })

  test("ignores new-session deep links without directory", () => {
    expect(parseNewSessionDeepLink("swiftcoder://new-session")).toBeUndefined()
    expect(parseNewSessionDeepLink("swiftcoder://new-session?directory=")).toBeUndefined()
  })

  test("collects only valid new-session deep links", () => {
    const result = collectNewSessionDeepLinks([
      "swiftcoder://new-session?directory=/a",
      "swiftcoder://open-project?directory=/b",
      "swiftcoder://new-session?directory=/c&prompt=ship%20it",
    ])
    expect(result).toEqual([{ directory: "/a" }, { directory: "/c", prompt: "ship it" }])
  })

  test("drains global deep links once", () => {
    const target = {
      __SWIFTCODER__: {
        deepLinks: ["swiftcoder://open-project?directory=/a"],
      },
    } as unknown as Window & { __SWIFTCODER__?: { deepLinks?: string[] } }

    expect(drainPendingDeepLinks(target)).toEqual(["swiftcoder://open-project?directory=/a"])
    expect(drainPendingDeepLinks(target)).toEqual([])
  })
})

describe("layout workspace helpers", () => {
  test("normalizes trailing slash in workspace key", () => {
    expect(String(pathKey("/tmp/demo///"))).toBe("/tmp/demo")
    expect(String(pathKey("C:\\tmp\\demo\\\\"))).toBe("C:/tmp/demo")
  })

  test("preserves posix and drive roots in workspace key", () => {
    expect(String(pathKey("/"))).toBe("/")
    expect(String(pathKey("///"))).toBe("/")
    expect(String(pathKey("C:\\"))).toBe("C:/")
    expect(String(pathKey("C://"))).toBe("C:/")
    expect(String(pathKey("C:///"))).toBe("C:/")
  })

  test("keeps local first while preserving known order", () => {
    const result = effectiveWorkspaceOrder("/root", ["/root", "/b", "/c"], ["/root", "/c", "/a", "/b"])
    expect(result).toEqual(["/root", "/c", "/b"])
  })

  test("finds the latest root session across workspaces", () => {
    const result = latestRootSession(
      [
        {
          path: { directory: "/root" },
          session: [session({ id: "root", directory: "/root", time: { created: 1, updated: 1, archived: undefined } })],
        },
        {
          path: { directory: "/workspace" },
          session: [
            session({
              id: "workspace",
              directory: "/workspace",
              time: { created: 2, updated: 2, archived: undefined },
            }),
          ],
        },
      ],
      120_000,
    )

    expect(result?.id).toBe("workspace")
  })

  test("lists recent root sessions across projects without duplicates", () => {
    const newest = session({ id: "newest", directory: "/b", time: { created: 3, updated: 3, archived: undefined } })
    const result = recentRootSessions(
      [
        {
          path: { directory: "/a" },
          session: [session({ id: "older", directory: "/a", time: { created: 1, updated: 1, archived: undefined } })],
        },
        { path: { directory: "/b" }, session: [newest] },
        { path: { directory: "/b" }, session: [newest] },
      ],
      2,
    )
    expect(result.map((item) => item.id)).toEqual(["newest", "older"])
  })

  test("formats compact recent-session timestamps", () => {
    const now = 10 * 24 * 60 * 60 * 1_000
    expect(formatRecentSessionTime(now - 30_000, now)).toBe("Now")
    expect(formatRecentSessionTime(now - 25 * 60_000, now)).toBe("25m")
    expect(formatRecentSessionTime(now - 3 * 60 * 60_000, now)).toBe("3h")
    expect(formatRecentSessionTime(now - 25 * 60 * 60_000, now)).toBe("Yesterday")
  })

  test("uses the first sentence from the first user message as the chat label", () => {
    const messages = [
      { id: "assistant", role: "assistant" },
      { id: "first", role: "user" },
      { id: "second", role: "user" },
    ]
    const parts = {
      first: [{ type: "text", text: "  Fix the sidebar. Then run tests.  " }],
      second: [{ type: "text", text: "This should not be shown." }],
    }

    expect(firstUserMessageText(messages, parts)).toBe("Fix the sidebar.")
  })

  test("supports Chinese sentence punctuation in chat labels", () => {
    expect(
      firstUserMessageText([{ id: "first", role: "user" }], {
        first: [{ type: "text", text: "调整左侧导航。项目列表保持不变。" }],
      }),
    ).toBe("调整左侧导航。")
  })

  test("keeps explicitly placed chat sessions out of project lists", () => {
    expect(belongsToChat("chat")).toBe(true)
    expect(belongsToProject("chat")).toBe(false)
    expect(belongsToChat("project")).toBe(false)
    expect(belongsToProject("project")).toBe(true)
  })

  test("keeps legacy sessions without placement metadata in project lists", () => {
    expect(belongsToChat(undefined)).toBe(false)
    expect(belongsToProject(undefined)).toBe(true)
  })

  test("keeps placed chats visible when the project session window is trimmed", () => {
    const chat = session({ id: "chat-1", directory: "/workspace", time: { created: 1, updated: 2 } })
    const newerProjectSessions = Object.fromEntries(
      Array.from({ length: 7 }, (_, index) => {
        const item = session({
          id: `project-${index}`,
          directory: "/workspace",
          time: { created: index + 3, updated: index + 3 },
        })
        return [item.id, item]
      }),
    )

    expect(
      placedChatSessions(
        { "chat-1": "chat", ...Object.fromEntries(Object.keys(newerProjectSessions).map((id) => [id, "project"])) },
        { "chat-1": chat, ...newerProjectSessions },
        ["/workspace"],
      ).map((item) => item.id),
    ).toEqual(["chat-1"])
  })

  test("hides archived chats and chats from closed projects", () => {
    const archived = session({
      id: "archived",
      directory: "/workspace",
      time: { created: 1, updated: 2, archived: 3 },
    })
    const closed = session({ id: "closed", directory: "/closed", time: { created: 1, updated: 3 } })

    expect(
      placedChatSessions({ archived: "chat", closed: "chat" }, { archived, closed }, ["/workspace"]),
    ).toEqual([])
  })

  test("numbers only sessions that still have a default title", () => {
    expect(numberedDefaultSessionTitle("New session - 2026-08-09T10:00:00.000Z", 3)).toBe("New session 3")
    expect(numberedDefaultSessionTitle("New session", 4)).toBe("New session 4")
    expect(numberedDefaultSessionTitle("Current project analysis", 5)).toBeUndefined()
    expect(numberedDefaultSessionTitle("New session", undefined)).toBeUndefined()
  })

  test("sorts recent sessions by persisted update time instead of id", () => {
    const result = sortedRootSessions(
      {
        path: { directory: "/workspace" },
        session: [
          session({ id: "ses_z", directory: "/workspace", time: { created: 1, updated: 2, archived: undefined } }),
          session({ id: "ses_a", directory: "/workspace", time: { created: 1, updated: 3, archived: undefined } }),
        ],
      },
      3,
    )

    expect(result.map((item) => item.id)).toEqual(["ses_a", "ses_z"])
  })

  test("uses id only to break equal session timestamps", () => {
    const sessions = [
      session({ id: "ses_z", directory: "/workspace", time: { created: 1, updated: 2, archived: undefined } }),
      session({ id: "ses_a", directory: "/workspace", time: { created: 1, updated: 2, archived: undefined } }),
    ]

    expect(sessions.sort(compareSessionTime).map((item) => item.id)).toEqual(["ses_a", "ses_z"])
  })

  test("detects project permissions with a filter", () => {
    const result = hasProjectPermissions(
      {
        root: [{ id: "perm-root" }, { id: "perm-hidden" }],
        child: [{ id: "perm-child" }],
      },
      (item) => item.id === "perm-child",
    )

    expect(result).toBe(true)
  })

  test("ignores project permissions filtered out", () => {
    const result = hasProjectPermissions(
      {
        root: [{ id: "perm-root" }],
      },
      () => false,
    )

    expect(result).toBe(false)
  })

  test("ignores archived and child sessions when finding latest root session", () => {
    const result = latestRootSession(
      [
        {
          path: { directory: "/workspace" },
          session: [
            session({
              id: "archived",
              directory: "/workspace",
              time: { created: 10, updated: 10, archived: 10 },
            }),
            session({
              id: "child",
              directory: "/workspace",
              parentID: "parent",
              time: { created: 20, updated: 20, archived: undefined },
            }),
            session({
              id: "root",
              directory: "/workspace",
              time: { created: 30, updated: 30, archived: undefined },
            }),
          ],
        },
      ],
      120_000,
    )

    expect(result?.id).toBe("root")
  })

  test("finds the direct child on the active session path", () => {
    const list = [
      session({ id: "root", directory: "/workspace" }),
      session({ id: "child", directory: "/workspace", parentID: "root" }),
      session({ id: "leaf", directory: "/workspace", parentID: "child" }),
    ]

    expect(childSessionOnPath(list, "root", "leaf")?.id).toBe("child")
    expect(childSessionOnPath(list, "child", "leaf")?.id).toBe("leaf")
    expect(childSessionOnPath(list, "root", "root")).toBeUndefined()
    expect(childSessionOnPath(list, "root", "other")).toBeUndefined()
  })

  test("formats fallback project display name", () => {
    expect(displayName({ worktree: "/tmp/app" })).toBe("app")
    expect(displayName({ worktree: "/tmp/app", name: "My App" })).toBe("My App")
    expect(displayName({ worktree: "/" })).toBe("/")
  })

  test("scopes home project selection by server", () => {
    expect(
      toggleHomeProjectSelection(undefined, serverKey("https://debian.example"), "/home/luke/repos/amazon"),
    ).toEqual({
      server: serverKey("https://debian.example"),
      directory: "/home/luke/repos/amazon",
    })
    expect(
      toggleHomeProjectSelection(
        { server: serverKey("https://windows.example"), directory: "/home/luke/repos/amazon" },
        serverKey("https://debian.example"),
        "/home/luke/repos/amazon",
      ),
    ).toEqual({ server: serverKey("https://debian.example"), directory: "/home/luke/repos/amazon" })
    expect(
      toggleHomeProjectSelection(
        { server: serverKey("https://debian.example"), directory: "/home/luke/repos/amazon" },
        serverKey("https://debian.example"),
        "/home/luke/repos/amazon",
      ),
    ).toEqual({ server: serverKey("https://debian.example") })
  })

  test("closes a home project through its server context", () => {
    const closed: string[] = []

    expect(
      closeHomeProject(
        { server: serverKey("https://windows.example"), directory: "/shared" },
        serverKey("https://debian.example"),
        { close: (directory) => closed.push(directory) },
        "/shared",
      ),
    ).toEqual({ server: serverKey("https://windows.example"), directory: "/shared" })
    expect(closed).toEqual(["/shared"])
    expect(
      closeHomeProject(
        { server: serverKey("https://debian.example"), directory: "/shared" },
        serverKey("https://debian.example"),
        { close: (directory) => closed.push(directory) },
        "/shared",
      ),
    ).toEqual({ server: serverKey("https://debian.example") })
  })

  test("defers home project navigation until its server is active", () => {
    expect(
      homeProjectNavigation(serverKey("sidecar"), serverKey("https://debian.example"), "/YW1hem9u/session"),
    ).toEqual({
      server: serverKey("https://debian.example"),
      href: "/YW1hem9u/session",
    })
    expect(
      homeProjectNavigation(
        serverKey("https://debian.example"),
        serverKey("https://debian.example"),
        "/YW1hem9u/session",
      ),
    ).toEqual({
      href: "/YW1hem9u/session",
    })
  })

  test("preserves picker order when adding multiple projects", () => {
    expect(homeProjectDirectories(["/first", "/second"])).toEqual(["/first", "/second"])
    expect(homeProjectDirectories("/only")).toEqual(["/only"])
    expect(homeProjectDirectories(null)).toEqual([])
  })

  test("hides status derived from an inactive server", () => {
    let reads = 0
    const status = () => {
      reads++
      return { working: true, tint: "red" }
    }
    expect(homeSessionServerStatus(false, status)).toEqual({
      working: false,
      tint: undefined,
    })
    expect(reads).toBe(0)
    expect(homeSessionServerStatus(true, status)).toEqual({
      working: true,
      tint: "red",
    })
    expect(reads).toBe(1)
  })

  test("extracts api error message and fallback", () => {
    expect(errorMessage({ data: { message: "boom" } }, "fallback")).toBe("boom")
    expect(errorMessage(new Error("broken"), "fallback")).toBe("broken")
    expect(errorMessage("unknown", "fallback")).toBe("fallback")
  })
})
