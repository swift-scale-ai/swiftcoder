import { getFilename } from "@opencode-ai/core/util/path"
import { type Session } from "@opencode-ai/sdk/v2/client"
import { pathKey } from "@/utils/path-key"
import type { ServerConnection } from "@/context/server"
import type { HomeProjectSelection } from "@/context/layout"
import { sessionTitle } from "@/utils/session-title"

type SessionStore = {
  session?: Session[]
  path: { directory: string }
}

export function compareSessionTime(a: Session, b: Session) {
  const updated = (b.time.updated ?? b.time.created) - (a.time.updated ?? a.time.created)
  if (updated !== 0) return updated
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

const isRootVisibleSession = (session: Session, directory: string) =>
  pathKey(session.directory) === pathKey(directory) && !session.parentID && !session.time?.archived

export const roots = (store: SessionStore) =>
  (store.session ?? []).filter((session) => isRootVisibleSession(session, store.path.directory))

export const sortedRootSessions = (store: SessionStore, _now: number) => roots(store).sort(compareSessionTime)

export const latestRootSession = (stores: SessionStore[], _now: number) =>
  stores.flatMap(roots).sort(compareSessionTime)[0]

export const recentRootSessions = (stores: SessionStore[], limit: number) => {
  const seen = new Set<string>()
  return stores
    .flatMap(roots)
    .sort(compareSessionTime)
    .filter((session) => {
      const key = `${pathKey(session.directory)}\0${session.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, Math.max(0, limit))
}

export function firstUserMessageText(
  messages: readonly { id: string; role: string }[] | undefined,
  parts: Record<string, readonly { type: string; text?: string }[] | undefined>,
) {
  const message = messages?.find((item) => item.role === "user")
  if (!message) return

  const text = parts[message.id]
    ?.filter((part) => part.type === "text")
    .map((part) => part.text?.trim())
    .filter((part): part is string => !!part)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  if (!text) return

  return text.match(/^.*?[.!?。！？]/)?.[0] ?? text
}

export type SidebarSessionPlacement = "chat" | "project"

export const belongsToChat = (placement: SidebarSessionPlacement | undefined) => placement === "chat"

export const belongsToProject = (placement: SidebarSessionPlacement | undefined) => placement !== "chat"

export function numberedDefaultSessionTitle(title: string | undefined, ordinal: number | undefined) {
  if (!ordinal || ordinal < 1) return
  if (sessionTitle(title) !== "New session") return
  return `New session ${ordinal}`
}

export function formatRecentSessionTime(value: number, now = Date.now()) {
  const elapsed = Math.max(0, now - value)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (elapsed < minute) return "Now"
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m`
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h`
  if (elapsed < 2 * day) return "Yesterday"
  return `${Math.floor(elapsed / day)}d`
}

export function hasProjectPermissions<T>(
  request: Record<string, T[] | undefined> | undefined,
  include: (item: T) => boolean = () => true,
) {
  return Object.values(request ?? {}).some((list) => list?.some(include))
}

export const childSessionOnPath = (sessions: Session[] | undefined, rootID: string, activeID?: string) => {
  if (!activeID || activeID === rootID) return
  const map = new Map((sessions ?? []).map((session) => [session.id, session]))
  let id = activeID

  while (id) {
    const session = map.get(id)
    if (!session?.parentID) return
    if (session.parentID === rootID) return session
    id = session.parentID
  }
}

export const displayName = (project: { name?: string; worktree: string }) =>
  project.name || getFilename(project.worktree) || project.worktree

export function toggleHomeProjectSelection(
  current: HomeProjectSelection | undefined,
  server: ServerConnection.Key,
  directory: string,
): HomeProjectSelection {
  if (current?.server === server && current.directory === directory) return { server }
  return { server, directory }
}

export function closeHomeProject(
  selected: HomeProjectSelection | undefined,
  server: ServerConnection.Key,
  projects: { close: (directory: string) => void },
  directory: string,
) {
  projects.close(directory)
  if (selected?.server === server && selected.directory === directory) return { server }
  return selected
}

export function homeProjectNavigation(active: ServerConnection.Key, server: ServerConnection.Key, href: string) {
  if (active === server) return { href }
  return { server, href }
}

export function homeProjectDirectories(result: string | string[] | null) {
  if (!result) return []
  return Array.isArray(result) ? result : [result]
}

export function homeSessionServerStatus(active: boolean, status: () => { working: boolean; tint?: string }) {
  if (!active) return { working: false, tint: undefined }
  return status()
}

const SWIFTCODER_PROJECT_ID = "4b0ea68d7af9a6031a7ffda7ad66e0cb83315750"

export function getProjectAvatarSource(id?: string, icon?: { color?: string; url?: string; override?: string }) {
  if (id === SWIFTCODER_PROJECT_ID) return "https://swift-scale.com/favicon.svg"
  if (icon?.override) return icon.override
  if (icon?.color) return undefined
  return icon?.url
}

export function projectForSession<T extends { id?: string; worktree: string; sandboxes?: string[] }>(
  session: Session,
  projects: T[],
  byID: Map<string, T> = new Map(projects.flatMap((project) => (project.id ? [[project.id, project] as const] : []))),
) {
  const direct = byID.get(session.projectID)
  if (direct) return direct
  const directory = pathKey(session.directory)
  return projects.find(
    (project) =>
      pathKey(project.worktree) === directory || project.sandboxes?.some((sandbox) => pathKey(sandbox) === directory),
  )
}

export const errorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

export const effectiveWorkspaceOrder = (local: string, dirs: string[], persisted?: string[]) => {
  const root = pathKey(local)
  const live = new Map<string, string>()

  for (const dir of dirs) {
    const key = pathKey(dir)
    if (key === root) continue
    if (!live.has(key)) live.set(key, dir)
  }

  if (!persisted?.length) return [local, ...live.values()]

  const result = [local]
  for (const dir of persisted) {
    const key = pathKey(dir)
    if (key === root) continue
    const match = live.get(key)
    if (!match) continue
    result.push(match)
    live.delete(key)
  }

  return [...result, ...live.values()]
}
