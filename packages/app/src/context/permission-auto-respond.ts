import { base64Encode } from "@opencode-ai/core/util/encode"
import type { ApprovalMode } from "./permission-mode"

export function acceptKey(sessionID: string, directory?: string) {
  if (!directory) return sessionID
  return `${base64Encode(directory)}/${sessionID}`
}

export function directoryAcceptKey(directory: string) {
  return `${base64Encode(directory)}/*`
}

function accepted(autoAccept: Record<string, boolean>, sessionID: string, directory?: string) {
  const key = acceptKey(sessionID, directory)
  return autoAccept[key] ?? autoAccept[sessionID]
}

function selectedMode(modes: Record<string, ApprovalMode>, sessionID: string, directory?: string) {
  const key = acceptKey(sessionID, directory)
  return modes[key] ?? modes[sessionID]
}

export function isDirectoryAutoAccepting(autoAccept: Record<string, boolean>, directory: string) {
  const key = directoryAcceptKey(directory)
  return autoAccept[key] ?? false
}

function sessionLineage(session: { id: string; parentID?: string }[], sessionID: string) {
  const parent = session.reduce((acc, item) => {
    if (item.parentID) acc.set(item.id, item.parentID)
    return acc
  }, new Map<string, string>())
  const seen = new Set([sessionID])
  const ids = [sessionID]

  for (const id of ids) {
    const parentID = parent.get(id)
    if (!parentID || seen.has(parentID)) continue
    seen.add(parentID)
    ids.push(parentID)
  }

  return ids
}

export function autoRespondsPermission(
  autoAccept: Record<string, boolean>,
  session: { id: string; parentID?: string }[],
  permission: { sessionID: string },
  directory?: string,
) {
  const value = sessionAutoAccept(autoAccept, session, permission, directory)
  if (value !== undefined) return value
  return directory ? isDirectoryAutoAccepting(autoAccept, directory) : false
}

export function sessionAutoAccept(
  autoAccept: Record<string, boolean>,
  session: { id: string; parentID?: string }[],
  permission: { sessionID: string },
  directory?: string,
) {
  return sessionLineage(session, permission.sessionID)
    .map((id) => accepted(autoAccept, id, directory))
    .find((item): item is boolean => item !== undefined)
}

export function approvalModeFor(
  modes: Record<string, ApprovalMode>,
  autoAccept: Record<string, boolean>,
  session: { id: string; parentID?: string }[],
  sessionID: string,
  directory?: string,
): ApprovalMode {
  const inherited = sessionLineage(session, sessionID)
    .map((id) => selectedMode(modes, id, directory))
    .find((item): item is ApprovalMode => item !== undefined)
  if (inherited) return inherited

  if (directory) {
    const directoryMode = modes[directoryAcceptKey(directory)]
    if (directoryMode) return directoryMode
  }

  const legacy = sessionAutoAccept(autoAccept, session, { sessionID }, directory)
  if (legacy !== undefined) return legacy ? "full" : "ask"
  if (directory && isDirectoryAutoAccepting(autoAccept, directory)) return "full"
  return "agent"
}
