import { randomUUID } from "node:crypto"
import { createProductAnalytics } from "./product-analytics"
import { mkdirSync, rmSync } from "node:fs"
import * as http from "node:http"
import { createServer } from "node:net"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { getCACertificates, setDefaultCACertificates } from "node:tls"
import type { Event } from "electron"
import { app, BrowserWindow, dialog, shell } from "electron"
import { channelProduct, createDeepLinkRouter, createDeferredRestartCoordinator } from "@swiftscale/desktop-kit"

import { Deferred, Effect, Fiber } from "effect"
import contextMenu from "electron-context-menu"

import type { ServerReadyData } from "../preload/types"
import { checkAppExists } from "./apps"
import { CHANNEL } from "./constants"
import { registerIpcHandlers, sendDeepLinks, sendMenuCommand } from "./ipc"
import { forwardInitializationFailure } from "./initialization"
import { exportDebugLogs, initCrashReporter, initLogging, startNetLog, write as writeLog } from "./logging"
import { createMenu } from "./menu"
import {
  finishFirstLaunchOnboarding,
  initializeOldLayoutEligibility,
  isFirstLaunchOnboardingPending,
  isOldLayoutEligible,
} from "./onboarding"
import {
  getDefaultServerUrl,
  preferAppEnv,
  setDefaultServerUrl,
  spawnLocalServer,
  type SidecarListener,
} from "./server"
import { accountStoragePaths, activeAccountID } from "./account-storage"
import { setupAutoUpdater, showUpdaterDialog } from "./updater"
import { safeWebContentsURL } from "./window-state"
import {
  getLastFocusedWindow,
  registerRendererProtocol,
  setRelaunchHandler,
  setAppQuitting,
  setBackgroundColor,
  setDockIcon,
  restoreMainWindows,
} from "./windows"
import { migrate } from "./migrate"
import { cleanupStoreFiles } from "./store-cleanup"
import { getStore } from "./store"
import { startBackgroundCli } from "./background-cli"
import { setNativeTranslations } from "./native-translations"
import { createSwiftScaleAuthController, type SwiftScaleAuthController } from "./swiftscale-auth"
import { DELETE_LOCAL_DATA_ARG, deleteLocalData } from "./local-data"
import { SWIFTCODER_DESKTOP_PRODUCT } from "./product"
const TEST_ONBOARDING = process.env.SWIFTCODER_TEST_ONBOARDING === "1"
const SIDECAR_VERSION = process.env.SWIFTCODER_SIDECAR_V2 === "1" ? "v2" : "v1"
const jsCallStackFeature = "DocumentPolicyIncludeJSCallStacksInCrashReports"

let logger: ReturnType<typeof initLogging>
let server: SidecarListener | null = null
let swiftScaleAuth: SwiftScaleAuthController | null = null
let idleShutdownTimer: NodeJS.Timeout | undefined

const deepLinks = createDeepLinkRouter(SWIFTCODER_DESKTOP_PRODUCT.protocol)

function useEnvProxy() {
  try {
    // Electron 41.2 runs Node 24.14.1; latest @types/node@24 is 24.12.2.
    ;(http as any).setGlobalProxyFromEnv()
  } catch (error) {
    logger.warn("failed to load proxy environment", error)
  }
}

function emitDeepLinks(urls: string[]) {
  void deepLinks.receive(urls).then((remaining) => {
    const win = getLastFocusedWindow()
    if (win && remaining.length) sendDeepLinks(win, remaining)
  })
}

async function killSidecar() {
  if (!server) return
  const current = server
  server = null
  await current.stop()
}

function cancelIdleShutdown() {
  if (!idleShutdownTimer) return
  clearInterval(idleShutdownTimer)
  idleShutdownTimer = undefined
}

function scheduleIdleShutdown() {
  if (process.platform !== "darwin" || idleShutdownTimer) return
  if (SIDECAR_VERSION === "v2") {
    app.quit()
    return
  }

  const check = async () => {
    if (BrowserWindow.getAllWindows().length > 0) {
      cancelIdleShutdown()
      return
    }
    const current = server
    if (!current || !(await current.isIdle())) return
    cancelIdleShutdown()
    setAppQuitting()
    await killSidecar()
    app.quit()
  }

  idleShutdownTimer = setInterval(() => void check(), 15_000)
  idleShutdownTimer.unref()
  void check()
}

function ensureLoopbackNoProxy() {
  const loopback = ["127.0.0.1", "localhost", "::1"]
  const upsert = (key: string) => {
    const items = (process.env[key] ?? "")
      .split(",")
      .map((value: string) => value.trim())
      .filter((value: string) => Boolean(value))

    for (const host of loopback) {
      if (items.some((value: string) => value.toLowerCase() === host)) continue
      items.push(host)
    }

    process.env[key] = items.join(",")
  }

  upsert("NO_PROXY")
  upsert("no_proxy")
}

const main = Effect.gen(function* () {
  contextMenu({ showSaveImageAs: true, showLookUpSelection: false, showSearchWithGoogle: false })

  // on macOS apps run in `/` which can cause issues with ripgrep
  try {
    process.chdir(homedir())
  } catch {}

  process.env.SWIFTCODER_DISABLE_EMBEDDED_WEB_UI = "true"

  const productChannel = channelProduct(SWIFTCODER_DESKTOP_PRODUCT, CHANNEL)
  const appId = app.isPackaged ? productChannel.appId : SWIFTCODER_DESKTOP_PRODUCT.channels.dev.appId
  const onboardingTestRoot = ((): string | undefined => {
    if (!TEST_ONBOARDING) return

    const root = join(tmpdir(), `swiftcoder-onboarding-${randomUUID()}`)
    rmSync(root, { recursive: true, force: true })
    ;["data", "config", "cache", "state", "desktop", "session", "documents"].forEach((dir) =>
      mkdirSync(join(root, dir), { recursive: true }),
    )
    process.env.SWIFTCODER_DB = ":memory:"
    process.env.XDG_DATA_HOME = join(root, "data")
    process.env.XDG_CONFIG_HOME = join(root, "config")
    process.env.XDG_CACHE_HOME = join(root, "cache")
    process.env.XDG_STATE_HOME = join(root, "state")
    return root
  })()
  app.setName(app.isPackaged ? productChannel.name : SWIFTCODER_DESKTOP_PRODUCT.channels.dev.name)
  if (process.platform === "darwin") {
    app.setAboutPanelOptions({
      applicationName: app.isPackaged ? productChannel.name : SWIFTCODER_DESKTOP_PRODUCT.channels.dev.name,
      applicationVersion: app.getVersion(),
      version: "",
    })
  }
  app.setAppUserModelId(appId)
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }
  const accountStorage = accountStoragePaths(app.getPath("appData"), appId, activeAccountID())
  app.setPath("userData", onboardingTestRoot ? join(onboardingTestRoot, "desktop") : accountStorage.userData)
  if (process.argv.includes(DELETE_LOCAL_DATA_ARG))
    deleteLocalData(onboardingTestRoot ? app.getPath("userData") : accountStorage.root)
  if (onboardingTestRoot) app.setPath("sessionData", join(onboardingTestRoot, "session"))
  if (onboardingTestRoot) app.setPath("documents", join(onboardingTestRoot, "documents"))
  initializeOldLayoutEligibility(app.getPath("userData"))
  logger = initLogging()
  logger.log("account storage selected", {
    namespace: onboardingTestRoot ? "onboarding-test" : accountStorage.namespace,
  })
  writeLog("metrics", "app.opened")
  const productAnalytics = createProductAnalytics({
    store: getStore("swiftcoder.analytics"),
    uploadAllowed: app.isPackaged && !TEST_ONBOARDING,
  })
  productAnalytics.record("app.opened")
  initCrashReporter()

  let suppressAuthCredentialRelaunch = false
  const agentRuntimeRestarts = createDeferredRestartCoordinator<"login" | "logout">({
    onError: (error, reason) =>
      logger.error("failed to restart agent runtime after credential change", { reason, error }),
  })
  const queueAgentRuntimeRestart = (reason: "login" | "logout") => {
    if (agentRuntimeRestarts.pending() === undefined) {
      logger.log("agent runtime restart requested after SwiftScale credential change", { reason })
    }
    agentRuntimeRestarts.request(reason)
  }
  const stopSidecars = async () => {
    await killSidecar()
  }
  const relaunch = () => {
    setAppQuitting()
    void stopSidecars().finally(() => {
      app.relaunch()
      app.quit()
    })
  }
  const deleteAllLocalData = async () => {
    const result = await dialog.showMessageBox({
      type: "warning",
      title: "Delete SwiftCoder data?",
      message: "Delete all local SwiftCoder data on this Mac?",
      detail:
        "This removes sessions, settings, logs, caches, drafts, and the SwiftScale sign-in from this Mac. Project files are not deleted.",
      buttons: ["Delete and Restart", "Cancel"],
      defaultId: 1,
      cancelId: 1,
    })
    if (result.response !== 0) return false
    suppressAuthCredentialRelaunch = true
    await swiftScaleAuth
      ?.logout()
      .catch((error) => logger.warn("failed to revoke credentials during data deletion", error))
    await stopSidecars()
    setAppQuitting()
    app.relaunch({
      args: [...process.argv.slice(1).filter((arg) => arg !== DELETE_LOCAL_DATA_ARG), DELETE_LOCAL_DATA_ARG],
    })
    app.quit()
    return true
  }

  try {
    setDefaultCACertificates([...new Set([...getCACertificates("default"), ...getCACertificates("system")])])
  } catch (error) {
    logger.warn("failed to load system certificates", error)
  }

  logger.log("app starting", {
    version: app.getVersion(),
    packaged: app.isPackaged,
    onboardingTest: Boolean(onboardingTestRoot),
  })

  ensureLoopbackNoProxy()
  useEnvProxy()
  app.commandLine.appendSwitch("proxy-bypass-list", "<-loopback>")
  const features = app.commandLine.getSwitchValue("enable-features")
  app.commandLine.appendSwitch("enable-features", features ? `${jsCallStackFeature},${features}` : jsCallStackFeature)
  if (!app.isPackaged && !TEST_ONBOARDING) app.commandLine.appendSwitch("remote-debugging-port", "9222")

  const appEnvReady = preferAppEnv(app.getPath("userData"), Boolean(onboardingTestRoot))

  app.on("second-instance", (_event: Event, argv: string[]) => {
    const urls = argv.filter((arg: string) => deepLinks.accepts(arg))
    if (urls.length) {
      logger.log("deep link received via second-instance", { count: urls.length })
      emitDeepLinks(urls)
    }
    const win = getLastFocusedWindow()
    if (win) {
      win.show()
      win.focus()
    }
  })

  app.on("open-url", (event: Event, url: string) => {
    event.preventDefault()
    logger.log("deep link received via open-url", { protocol: new URL(url).protocol })
    emitDeepLinks([url])
  })

  app.on("before-quit", () => {
    cancelIdleShutdown()
    setAppQuitting()
    void stopSidecars()
  })

  app.on("will-quit", () => {
    cancelIdleShutdown()
    setAppQuitting()
    void stopSidecars()
  })

  app.on("child-process-gone", (_event, details) => {
    writeLog("utility", "child process gone", { details }, "error")
  })

  app.on("render-process-gone", (_event, webContents, details) => {
    writeLog("window", "app render process gone", { url: safeWebContentsURL(webContents), details }, "error")
  })

  setRelaunchHandler(() => {
    relaunch()
  })

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      setAppQuitting()
      void stopSidecars().finally(() => app.quit())
    })
  }

  const serverReady = Deferred.makeUnsafe<ServerReadyData, unknown>()

  yield* Effect.promise(() => app.whenReady())

  let testCredential =
    TEST_ONBOARDING && !app.isPackaged
      ? JSON.stringify({
          version: 1,
          auth: {
            type: "oauth",
            access: "swiftcoder-runtime-test-access",
            refresh: "swiftcoder-runtime-test-refresh",
            expires: Date.now() + 3_600_000,
            accountId: "acct_runtime_test",
          },
          account: {
            id: "acct_runtime_test",
            email: "developer@swift-scale.com",
            name: "SwiftCoder Developer",
            plan: "coding",
          },
        })
      : undefined
  swiftScaleAuth = createSwiftScaleAuthController({
    ...(testCredential
      ? {
          store: {
            get: async () => testCredential,
            set: async (value: string) => {
              testCredential = value
            },
            remove: async () => {
              testCredential = undefined
            },
          },
          fetch: (async (url: string | URL | Request) => {
            if (!String(url).endsWith("/account/entitlements")) {
              return Response.json({ error: { code: "not_found" } }, { status: 404 })
            }
            return Response.json(
              {
                tier: "lite",
                product: "coding",
                subscription: "active",
                usage: { level: "available", resets_at: "2026-09-01T00:00:00Z" },
                limits: { concurrent_tasks: 2, context_tier: "extended" },
                service: { status: "operational" },
              },
              { headers: { "x-request-id": "req_phase4_runtime" } },
            )
          }) as typeof fetch,
        }
      : {}),
    openExternal: (url) => shell.openExternal(url),
    onChanged: (status) => {
      if (status.state === "signed_in") writeLog("metrics", "activation.completed")
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send("swiftscale-auth-changed", status)
      }
    },
    onCredentialChanged: (reason) => {
      if (suppressAuthCredentialRelaunch) return
      logger.log("SwiftScale credential changed; restarting agent runtime", { reason })
      queueAgentRuntimeRestart(reason)
    },
  })
  deepLinks.registerHandler((urls) => swiftScaleAuth!.handleDeepLinks(urls))

  if (!TEST_ONBOARDING) migrate()
  yield* Effect.promise(() => cleanupStoreFiles(app.getPath("userData"))).pipe(
    Effect.tap((result) =>
      Effect.sync(() => {
        if (result.deleted.length === 0) return
        logger.log("cleaned scoped store files", { count: result.deleted.length, scanned: result.scanned })
      }),
    ),
    Effect.catch((error) =>
      Effect.sync(() => {
        logger.warn("failed to clean scoped store files", error)
      }),
    ),
  )
  app.setAsDefaultProtocolClient(SWIFTCODER_DESKTOP_PRODUCT.protocol)
  registerRendererProtocol()
  setDockIcon()
  const updater = setupAutoUpdater(stopSidecars)
  const menuDeps = {
    trigger: (id: string) => {
      const win = getLastFocusedWindow()
      if (win) sendMenuCommand(win, id)
    },
    checkForUpdates: () => void showUpdaterDialog(updater, true),
    relaunch,
  }
  registerIpcHandlers({
    killSidecar: () => killSidecar(),
    relaunch,
    awaitInitialization: Effect.fnUntraced(
      function* () {
        logger.log("awaiting server ready")
        const res = yield* Deferred.await(serverReady)
        logger.log("server ready", { url: res.url })
        return res
      },
      (e) => Effect.runPromise(e),
    ),
    consumeInitialDeepLinks: () => deepLinks.consumePending(),
    swiftScaleAuthStatus: () => swiftScaleAuth!.status(),
    swiftScaleAuthLogin: () => swiftScaleAuth!.login(),
    swiftScaleAuthLogout: () => swiftScaleAuth!.logout(),
    swiftScaleEntitlements: async (refresh) => {
      const value = await swiftScaleAuth!.entitlements(refresh)
      writeLog("metrics", "account.entitlements.loaded", {
        tier: value.tier,
        product: value.product,
        usage: value.usage.level,
        service: value.service.status,
        requestID: value.requestID,
      })
      return value
    },
    getDefaultServerUrl: () => getDefaultServerUrl(),
    setDefaultServerUrl: (url) => setDefaultServerUrl(url),
    isFirstLaunchOnboardingPending,
    finishFirstLaunchOnboarding,
    isOldLayoutEligible,
    checkAppExists: (appName) => checkAppExists(appName),
    updater,
    showUpdater: () => showUpdaterDialog(updater, true),
    setBackgroundColor: (color) => setBackgroundColor(color),
    exportDebugLogs: () => exportDebugLogs(),
    deleteLocalData: deleteAllLocalData,
    recordFatalRendererError: (error) => writeLog("renderer", "fatal renderer error", { ...error }, "error"),
    recordProductMetric: (name) => {
      writeLog("metrics", name)
      productAnalytics.record(name)
    },
    getProductAnalyticsEnabled: () => productAnalytics.enabled(),
    setProductAnalyticsEnabled: (enabled) => productAnalytics.setEnabled(enabled),
    setNativeTranslations: (bundle) => {
      if (setNativeTranslations(bundle)) createMenu(menuDeps)
    },
  })
  void updater.start()
  const updateTimer = setInterval(() => void updater.check(), 10 * 60 * 1000)
  updateTimer.unref()
  app.once("will-quit", () => clearInterval(updateTimer))
  yield* Effect.promise(() => startNetLog()).pipe(
    Effect.catch((error) =>
      Effect.sync(() => {
        logger.warn("failed to start net log", error)
      }),
    ),
  )

  const loadingTask = yield* Effect.gen(function* () {
    logger.log("sidecar connection started", { version: SIDECAR_VERSION })

    yield* Effect.promise(() => appEnvReady)

    ensureLoopbackNoProxy()
    useEnvProxy()
    const authContent = yield* Effect.promise(() => swiftScaleAuth!.credentialForSidecar())
    if (authContent) process.env.SWIFTCODER_AUTH_CONTENT = authContent
    else delete process.env.SWIFTCODER_AUTH_CONTENT

    if (SIDECAR_VERSION === "v2") {
      logger.log("spawning v2 sidecar")
      const sidecar = yield* Effect.promise(() => startBackgroundCli(logger, process.env.XDG_STATE_HOME))
      yield* Deferred.succeed(serverReady, {
        url: sidecar.url,
        username: sidecar.username,
        password: sidecar.password,
      })
      agentRuntimeRestarts.bind(async () => {
        const nextAuthContent = await swiftScaleAuth!.credentialForSidecar()
        if (nextAuthContent) process.env.SWIFTCODER_AUTH_CONTENT = nextAuthContent
        else delete process.env.SWIFTCODER_AUTH_CONTENT
        await startBackgroundCli(logger, process.env.XDG_STATE_HOME, true)
        logger.log("agent runtime restarted after SwiftScale credential change")
      })

      logger.log("loading task finished")
      return
    }

    const port = yield* Effect.gen(function* () {
      const fromEnv = process.env.SWIFTCODER_PORT
      if (fromEnv) {
        const parsed = Number.parseInt(fromEnv, 10)
        if (!Number.isNaN(parsed)) return parsed
      }

      const res = yield* Deferred.make<number, unknown>()
      const socket = createServer()
      socket.on("error", (e) => Deferred.failSync(res, () => e))
      socket.listen(0, "127.0.0.1", () => {
        const address = socket.address()
        if (typeof address !== "object" || !address) {
          socket.close()
          Deferred.failSync(res, () => new Error("Failed to get port"))
          return
        }
        const port = address.port
        socket.close(() => Effect.runSync(Deferred.succeed(res, port)))
      })

      return yield* Deferred.await(res)
    })
    const hostname = "127.0.0.1"
    const url = `http://${hostname}:${port}`
    const password = randomUUID()

    logger.log("spawning sidecar", { url })
    const { listener, health } = yield* Effect.promise(() =>
      spawnLocalServer(hostname, port, password, {
        userDataPath: app.getPath("userData"),
        authContent,
        onStdout: (message) => writeLog("server", "stdout", { message }),
        onStderr: (message) => writeLog("server", "stderr", { message }, "warn"),
        onExit: (code) => writeLog("utility", "sidecar exited", { code }, "warn"),
      }),
    )
    server = listener
    yield* Deferred.succeed(serverReady, {
      url,
      username: "swiftcoder",
      password,
    })

    yield* Effect.promise(() => health.wait).pipe(
      Effect.timeout("30 seconds"),
      Effect.catch((e) =>
        Effect.sync(() => {
          logger.error("sidecar health check failed", e.toString())
        }),
      ),
    )

    agentRuntimeRestarts.bind(async () => {
      await killSidecar()
      const nextAuthContent = await swiftScaleAuth!.credentialForSidecar()
      if (nextAuthContent) process.env.SWIFTCODER_AUTH_CONTENT = nextAuthContent
      else delete process.env.SWIFTCODER_AUTH_CONTENT
      const next = await spawnLocalServer(hostname, port, password, {
        userDataPath: app.getPath("userData"),
        authContent: nextAuthContent,
        onStdout: (message) => writeLog("server", "stdout", { message }),
        onStderr: (message) => writeLog("server", "stderr", { message }, "warn"),
        onExit: (code) => writeLog("utility", "sidecar exited", { code }, "warn"),
      })
      server = next.listener
      await next.health.wait
      logger.log("agent runtime restarted after SwiftScale credential change")
    })

    logger.log("loading task finished")
  }).pipe(forwardInitializationFailure(serverReady), Effect.forkChild)

  app.on("window-all-closed", () => {
    if (process.platform === "darwin") {
      scheduleIdleShutdown()
      return
    }
    app.quit()
  })
  app.on("activate", () => {
    cancelIdleShutdown()
    if (BrowserWindow.getAllWindows().length > 0) return
    restoreMainWindows()
  })

  const windows = restoreMainWindows()
  if (windows.length) createMenu(menuDeps)

  yield* Fiber.await(loadingTask)
})

Effect.runFork(main)
