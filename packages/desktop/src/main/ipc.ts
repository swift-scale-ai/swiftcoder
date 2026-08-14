import { execFile } from "node:child_process"
import { stat } from "node:fs/promises"
import { basename, join } from "node:path"
import { app, BrowserWindow, clipboard, dialog, shell } from "electron"
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron"
import type { DesktopMenuAction } from "@swiftscale/coder-app/desktop-menu"
import { parseDesktopNativeBundle, type DesktopNativeBundle } from "@swiftscale/coder-app/i18n/desktop-native"

import type { FatalRendererError, ProductMetric, ServerReadyData, TitlebarTheme } from "../preload/types"
import type { SwiftScaleAuthStatus, SwiftScaleEntitlements } from "./swiftscale-auth-contract"
import { runDesktopMenuAction } from "./desktop-menu-actions"
import { setForceFocus } from "./debug"
import { assertAttachmentBudget, createPickedFileAuthorizations } from "./attachment-picker"
import { getStore, removeStoreFileIfEmpty } from "./store"
import {
  getPinchZoomEnabled,
  getWindowID,
  openExternalURL,
  openLocalFileURL,
  setPinchZoomEnabled,
  setTitlebar,
  updateTitlebar,
} from "./windows"
import type { UpdaterController } from "./updater-controller"
import { createUpdaterSubscriptions } from "./updater-subscriptions"
import { createDesktopDraftStore } from "./draft-store"
import { nativeT } from "./native-translations"
import { handleTrustedIpc, onTrustedIpc } from "./ipc-security"

const pickerFilters = (ext?: string[]) => {
  if (!ext || ext.length === 0) return undefined
  return [{ name: nativeT("desktop.dialog.files"), extensions: ext }]
}

const pickedFiles = createPickedFileAuthorizations()

type Deps = {
  killSidecar: () => Promise<void> | void
  relaunch: () => void
  awaitInitialization: () => Promise<ServerReadyData>
  consumeInitialDeepLinks: () => Promise<string[]> | string[]
  swiftScaleAuthStatus: () => Promise<SwiftScaleAuthStatus>
  swiftScaleAuthLogin: () => Promise<SwiftScaleAuthStatus>
  swiftScaleAuthLogout: () => Promise<SwiftScaleAuthStatus>
  swiftScaleEntitlements: (refresh: boolean) => Promise<SwiftScaleEntitlements>
  getDefaultServerUrl: () => Promise<string | null> | string | null
  setDefaultServerUrl: (url: string | null) => Promise<void> | void
  isFirstLaunchOnboardingPending: () => Promise<boolean> | boolean
  finishFirstLaunchOnboarding: (createDefaultProject: boolean) => Promise<string | null> | string | null
  isOldLayoutEligible: () => Promise<boolean> | boolean
  checkAppExists: (appName: string) => Promise<boolean> | boolean
  updater: UpdaterController
  showUpdater: () => Promise<void> | void
  setBackgroundColor: (color: string) => void
  exportDebugLogs: () => Promise<string>
  deleteLocalData: () => Promise<boolean>
  recordFatalRendererError: (error: FatalRendererError) => Promise<void> | void
  recordProductMetric: (name: ProductMetric) => Promise<void> | void
  getProductAnalyticsEnabled: () => Promise<boolean> | boolean
  setProductAnalyticsEnabled: (enabled: boolean) => Promise<void> | void
  setNativeTranslations: (bundle: DesktopNativeBundle) => void
}

export function registerIpcHandlers(deps: Deps) {
  const drafts = createDesktopDraftStore(join(app.getPath("userData"), "drafts.sqlite"))
  const updaterSubscriptions = createUpdaterSubscriptions()
  app.once("will-quit", updaterSubscriptions.clear)
  app.on("before-quit", () => drafts.flush())
  app.once("will-quit", () => drafts.close())
  app.on("browser-window-created", (_event, win) => win.on("session-end", () => drafts.flush()))

  handleTrustedIpc("kill-sidecar", () => deps.killSidecar())
  handleTrustedIpc("await-initialization", () => deps.awaitInitialization())
  handleTrustedIpc("consume-initial-deep-links", () => deps.consumeInitialDeepLinks())
  handleTrustedIpc("swiftscale-auth-status", () => deps.swiftScaleAuthStatus())
  handleTrustedIpc("swiftscale-auth-login", () => deps.swiftScaleAuthLogin())
  handleTrustedIpc("swiftscale-auth-logout", () => deps.swiftScaleAuthLogout())
  handleTrustedIpc("swiftscale-entitlements", (_event: IpcMainInvokeEvent, refresh: boolean) =>
    deps.swiftScaleEntitlements(refresh),
  )
  handleTrustedIpc("get-default-server-url", () => deps.getDefaultServerUrl())
  handleTrustedIpc("set-default-server-url", (_event: IpcMainInvokeEvent, url: string | null) =>
    deps.setDefaultServerUrl(url),
  )
  handleTrustedIpc("is-first-launch-onboarding-pending", () => deps.isFirstLaunchOnboardingPending())
  handleTrustedIpc("finish-first-launch-onboarding", (_event: IpcMainInvokeEvent, createDefaultProject: boolean) =>
    deps.finishFirstLaunchOnboarding(createDefaultProject),
  )
  handleTrustedIpc("is-old-layout-eligible", () => deps.isOldLayoutEligible())
  handleTrustedIpc("check-app-exists", (_event: IpcMainInvokeEvent, appName: string) => deps.checkAppExists(appName))
  handleTrustedIpc("updater-subscribe", (event) => {
    const id = event.sender.id
    updaterSubscriptions.set(
      id,
      deps.updater.subscribe((state) => {
        if (event.sender.isDestroyed()) return updaterSubscriptions.delete(id)
        event.sender.send("updater-state", state)
      }),
    )
    event.sender.once("destroyed", () => updaterSubscriptions.delete(id))
  })
  handleTrustedIpc("updater-unsubscribe", (event) => updaterSubscriptions.delete(event.sender.id))
  handleTrustedIpc("updater-check", () => deps.updater.check())
  handleTrustedIpc("updater-install", () => deps.updater.install())
  handleTrustedIpc("set-background-color", (_event: IpcMainInvokeEvent, color: string) =>
    deps.setBackgroundColor(color),
  )
  handleTrustedIpc("export-debug-logs", () => deps.exportDebugLogs())
  handleTrustedIpc("delete-local-data", () => deps.deleteLocalData())
  handleTrustedIpc("set-force-focus", (event: IpcMainInvokeEvent, enabled: boolean) =>
    setForceFocus(event.sender, enabled),
  )
  handleTrustedIpc("record-fatal-renderer-error", (_event: IpcMainInvokeEvent, error: FatalRendererError) =>
    deps.recordFatalRendererError(error),
  )
  handleTrustedIpc("record-product-metric", (_event: IpcMainInvokeEvent, name: ProductMetric) =>
    deps.recordProductMetric(name),
  )
  handleTrustedIpc("get-product-analytics-enabled", () => deps.getProductAnalyticsEnabled())
  handleTrustedIpc("set-product-analytics-enabled", (_event: IpcMainInvokeEvent, enabled: boolean) =>
    deps.setProductAnalyticsEnabled(enabled),
  )
  handleTrustedIpc("set-native-translations", (event: IpcMainInvokeEvent, value: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed() || win.webContents !== event.sender || event.senderFrame !== event.sender.mainFrame) {
      throw new Error("Invalid native translation sender")
    }
    const bundle = parseDesktopNativeBundle(value)
    if (!bundle) throw new Error("Invalid native translation bundle")
    deps.setNativeTranslations(bundle)
  })
  handleTrustedIpc("store-get", (_event: IpcMainInvokeEvent, name: string, key: string) => {
    try {
      const store = getStore(name)
      const value = store.get(key)
      if (value === undefined || value === null) return null
      return typeof value === "string" ? value : JSON.stringify(value)
    } catch {
      return null
    }
  })
  handleTrustedIpc("store-set", (_event: IpcMainInvokeEvent, name: string, key: string, value: string) => {
    getStore(name).set(key, value)
  })
  handleTrustedIpc("store-delete", (_event: IpcMainInvokeEvent, name: string, key: string) => {
    getStore(name).delete(key)
    void removeStoreFileIfEmpty(name)
  })
  handleTrustedIpc("store-clear", (_event: IpcMainInvokeEvent, name: string) => {
    getStore(name).clear()
    void removeStoreFileIfEmpty(name)
  })
  handleTrustedIpc("store-keys", (_event: IpcMainInvokeEvent, name: string) => {
    const store = getStore(name)
    return Object.keys(store.store)
  })
  handleTrustedIpc("store-length", (_event: IpcMainInvokeEvent, name: string) => {
    const store = getStore(name)
    return Object.keys(store.store).length
  })
  handleTrustedIpc("draft-get", (_event, key: string) => drafts.get(key))
  handleTrustedIpc("draft-set", (_event, key: string, value: string) => drafts.set(key, value))
  handleTrustedIpc("draft-delete", (_event, key: string) => drafts.set(key, null))
  handleTrustedIpc("draft-blob-put", (_event, data: ArrayBuffer) => drafts.putBlob(new Uint8Array(data)))
  handleTrustedIpc("draft-blob-get", (_event, id: string) => {
    const data = drafts.getBlob(id)
    return data ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : null
  })

  handleTrustedIpc(
    "open-directory-picker",
    async (_event: IpcMainInvokeEvent, opts?: { multiple?: boolean; title?: string; defaultPath?: string }) => {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory", ...(opts?.multiple ? ["multiSelections" as const] : []), "createDirectory"],
        title: opts?.title ?? nativeT("desktop.dialog.chooseFolder"),
        defaultPath: opts?.defaultPath,
      })
      if (result.canceled) return null
      return opts?.multiple ? result.filePaths : result.filePaths[0]
    },
  )

  handleTrustedIpc(
    "open-file-picker",
    async (
      event: IpcMainInvokeEvent,
      opts?: { multiple?: boolean; title?: string; defaultPath?: string; extensions?: string[] },
    ) => {
      const result = await dialog.showOpenDialog({
        properties: ["openFile", ...(opts?.multiple ? ["multiSelections" as const] : [])],
        title: opts?.title ?? nativeT("desktop.dialog.chooseFile"),
        defaultPath: opts?.defaultPath,
        filters: pickerFilters(opts?.extensions),
      })
      if (result.canceled) return null
      const files = await Promise.all(
        result.filePaths.map(async (filePath) => ({
          path: filePath,
          name: basename(filePath),
          size: (await stat(filePath)).size,
        })),
      )
      assertAttachmentBudget(files)
      const token = pickedFiles.add(event.sender.id, result.filePaths)
      return { token, files }
    },
  )

  handleTrustedIpc("read-picked-file", async (event: IpcMainInvokeEvent, token: string, filePath: string) => {
    return pickedFiles.read(event.sender.id, token, filePath)
  })

  handleTrustedIpc("release-picked-files", (event: IpcMainInvokeEvent, token: string) => {
    pickedFiles.release(event.sender.id, token)
  })

  handleTrustedIpc(
    "save-file-picker",
    async (_event: IpcMainInvokeEvent, opts?: { title?: string; defaultPath?: string }) => {
      const result = await dialog.showSaveDialog({
        title: opts?.title ?? nativeT("desktop.dialog.saveFile"),
        defaultPath: opts?.defaultPath,
      })
      if (result.canceled) return null
      return result.filePath ?? null
    },
  )

  onTrustedIpc("open-external", (_event: IpcMainEvent, url: string) => {
    openExternalURL(url)
  })

  onTrustedIpc("open-local-file", (_event: IpcMainEvent, url: string) => {
    openLocalFileURL(url)
  })

  handleTrustedIpc("open-path", async (_event: IpcMainInvokeEvent, path: string, app?: string) => {
    if (!app) return shell.openPath(path)
    await new Promise<void>((resolve, reject) => {
      const [cmd, args] =
        process.platform === "darwin" ? (["open", ["-a", app, path]] as const) : ([app, [path]] as const)
      execFile(cmd, args, (err) => (err ? reject(err) : resolve()))
    })
  })

  handleTrustedIpc("reveal-path", async (_event: IpcMainInvokeEvent, path: string) => {
    const exists = await stat(path).then(
      () => true,
      () => false,
    )
    if (!exists) return false
    shell.showItemInFolder(path)
    return true
  })

  handleTrustedIpc("read-clipboard-image", () => {
    const image = clipboard.readImage()
    if (image.isEmpty()) return null
    const buffer = image.toPNG().buffer
    const size = image.getSize()
    return { buffer, width: size.width, height: size.height }
  })

  handleTrustedIpc("get-window-id", (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error("Window not found")
    const id = getWindowID(win)
    if (!id) throw new Error("Window ID not found")
    return id
  })

  handleTrustedIpc("get-window-focused", (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win?.isFocused() ?? false
  })

  handleTrustedIpc("get-window-fullscreen", (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win?.isFullScreen() ?? false
  })

  handleTrustedIpc("set-window-focus", (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.focus()
  })

  handleTrustedIpc("show-window", (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.show()
  })

  onTrustedIpc("relaunch", () => {
    deps.relaunch()
  })

  handleTrustedIpc("get-zoom-factor", (event: IpcMainInvokeEvent) => event.sender.getZoomFactor())
  handleTrustedIpc("set-zoom-factor", (event: IpcMainInvokeEvent, factor: number) => {
    event.sender.setZoomFactor(factor)
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    updateTitlebar(win)
  })
  handleTrustedIpc("get-pinch-zoom-enabled", () => getPinchZoomEnabled())
  handleTrustedIpc("set-pinch-zoom-enabled", (_event: IpcMainInvokeEvent, enabled: boolean) => {
    setPinchZoomEnabled(enabled)
  })
  handleTrustedIpc("set-titlebar", (event: IpcMainInvokeEvent, theme: TitlebarTheme) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    setTitlebar(win, theme)
  })
  handleTrustedIpc("run-desktop-menu-action", (event: IpcMainInvokeEvent, action: DesktopMenuAction) => {
    runDesktopMenuAction(BrowserWindow.fromWebContents(event.sender), action, {
      checkForUpdates: () => void deps.showUpdater(),
      relaunch: deps.relaunch,
    })
  })
}

export function sendMenuCommand(win: BrowserWindow, id: string) {
  win.webContents.send("menu-command", id)
}

export function sendDeepLinks(win: BrowserWindow, urls: string[]) {
  win.webContents.send("deep-link", urls)
}
