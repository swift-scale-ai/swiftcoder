import { app } from "electron"
import type { IpcMainInvokeEvent } from "electron"
import type { WslServersController } from "./servers"
import { requireWslIpcString, requireWslIpcStrings } from "./policy"
import type { WslServersState } from "@opencode-ai/app/wsl/types"
import { nativeT } from "../native-translations"
import { handleTrustedIpc } from "../ipc-security"

export function registerWslIpcHandlers(controller: WslServersController) {
  if (process.platform !== "win32") {
    registerUnavailableWslIpcHandlers()
    return
  }

  const subscriptions = new Map<number, () => void>()
  const unsubscribe = (id: number) => {
    const off = subscriptions.get(id)
    if (!off) return
    off()
    subscriptions.delete(id)
  }

  app.once("will-quit", () => {
    subscriptions.forEach((off) => off())
    subscriptions.clear()
  })

  handleTrustedIpc("wsl-servers-subscribe", (event) => {
    const id = event.sender.id
    if (subscriptions.has(id)) return
    subscriptions.set(
      id,
      controller.subscribe((payload) => {
        if (event.sender.isDestroyed()) {
          unsubscribe(id)
          return
        }
        event.sender.send("wsl-servers-event", payload)
      }),
    )
    event.sender.once("destroyed", () => unsubscribe(id))
  })
  handleTrustedIpc("wsl-servers-unsubscribe", (event) => unsubscribe(event.sender.id))
  handleTrustedIpc("wsl-servers-get-state", () => controller.getState())
  handleTrustedIpc("wsl-servers-probe-runtime", () => controller.probeRuntime())
  handleTrustedIpc("wsl-servers-refresh-distros", () => controller.refreshDistros())
  handleTrustedIpc("wsl-servers-install-wsl", () => controller.installWsl())
  handleTrustedIpc("wsl-servers-install-distro", (_event: IpcMainInvokeEvent, name: string) =>
    controller.installDistro(requireWslIpcString("distro", name)),
  )
  handleTrustedIpc("wsl-servers-probe-addable", (_event: IpcMainInvokeEvent, distros: string[]) =>
    controller.probeAddable(requireWslIpcStrings("distro", distros)),
  )
  handleTrustedIpc("wsl-servers-install-swiftcoder", (_event: IpcMainInvokeEvent, name: string) =>
    controller.installSwiftCoder(requireWslIpcString("distro", name)),
  )
  handleTrustedIpc("wsl-servers-open-terminal", (_event: IpcMainInvokeEvent, name: string) =>
    controller.openTerminal(requireWslIpcString("distro", name)),
  )
  handleTrustedIpc("wsl-servers-add", (_event: IpcMainInvokeEvent, distro: string) =>
    controller.addServer(requireWslIpcString("distro", distro)),
  )
  handleTrustedIpc("wsl-servers-remove", (_event: IpcMainInvokeEvent, id: string) =>
    controller.removeServer(requireWslIpcString("server id", id)),
  )
  handleTrustedIpc("wsl-servers-start", (_event: IpcMainInvokeEvent, id: string) =>
    controller.startServer(requireWslIpcString("server id", id)),
  )
}

function registerUnavailableWslIpcHandlers() {
  const unavailable = () => {
    throw new Error(nativeT("desktop.wsl.error.windowsOnly"))
  }
  const state = (): WslServersState => ({
    runtime: {
      available: false,
      version: null,
      error: nativeT("desktop.wsl.error.windowsOnly"),
    },
    installed: [],
    online: [],
    distroProbes: {},
    swiftcoderChecks: {},
    pendingRestart: false,
    servers: [],
    job: null,
  })

  handleTrustedIpc("wsl-servers-subscribe", (event) => {
    event.sender.send("wsl-servers-event", { type: "state", state: state() })
  })
  handleTrustedIpc("wsl-servers-unsubscribe", () => undefined)
  handleTrustedIpc("wsl-servers-get-state", () => state())
  handleTrustedIpc("wsl-servers-probe-runtime", unavailable)
  handleTrustedIpc("wsl-servers-refresh-distros", unavailable)
  handleTrustedIpc("wsl-servers-install-wsl", unavailable)
  handleTrustedIpc("wsl-servers-install-distro", unavailable)
  handleTrustedIpc("wsl-servers-probe-addable", unavailable)
  handleTrustedIpc("wsl-servers-install-swiftcoder", unavailable)
  handleTrustedIpc("wsl-servers-open-terminal", unavailable)
  handleTrustedIpc("wsl-servers-add", unavailable)
  handleTrustedIpc("wsl-servers-remove", unavailable)
  handleTrustedIpc("wsl-servers-start", unavailable)
}
