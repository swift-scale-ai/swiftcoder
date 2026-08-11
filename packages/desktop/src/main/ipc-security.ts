import { BrowserWindow, ipcMain } from "electron"
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron"
import { assertIpcArguments } from "./ipc-contract"
import { isTrustedRendererURL } from "./renderer-security"
import { write as writeLog } from "./logging"

type IpcEvent = IpcMainEvent | IpcMainInvokeEvent
type IpcHandler<T extends unknown[]> = (event: IpcMainInvokeEvent, ...args: T) => unknown
type IpcListener<T extends unknown[]> = (event: IpcMainEvent, ...args: T) => void

export function assertTrustedIpcSender(event: IpcEvent) {
  const win = BrowserWindow.fromWebContents(event.sender)
  const frame = event.senderFrame
  if (
    !win ||
    win.isDestroyed() ||
    win.webContents !== event.sender ||
    !frame ||
    frame !== event.sender.mainFrame ||
    !isTrustedRendererURL(frame.url)
  ) {
    throw new Error("Rejected IPC request from untrusted renderer")
  }
}

export function handleTrustedIpc<T extends unknown[]>(channel: string, handler: IpcHandler<T>) {
  ipcMain.handle(channel, (event, ...args: unknown[]) => {
    assertTrustedIpcSender(event)
    assertIpcArguments(channel, args)
    return handler(event, ...(args as T))
  })
}

export function onTrustedIpc<T extends unknown[]>(channel: string, listener: IpcListener<T>) {
  ipcMain.on(channel, (event, ...args: unknown[]) => {
    try {
      assertTrustedIpcSender(event)
      assertIpcArguments(channel, args)
    } catch (error) {
      writeLog("ipc", "rejected renderer event", { channel, error }, "warn")
      return
    }
    listener(event, ...(args as T))
  })
}
