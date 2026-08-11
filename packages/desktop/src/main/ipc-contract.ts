type Validator = (value: unknown) => boolean

const maxShortString = 512
const maxPathString = 16 * 1024
const maxContentString = 4 * 1024 * 1024
const maxBlobBytes = 50 * 1024 * 1024

const string =
  (limit = maxShortString): Validator =>
  (value) =>
    typeof value === "string" && value.length <= limit
const nullable =
  (validator: Validator): Validator =>
  (value) =>
    value === null || validator(value)
const boolean: Validator = (value) => typeof value === "boolean"
const finiteNumber: Validator = (value) => typeof value === "number" && Number.isFinite(value)
const path: Validator = (value) => string(maxPathString)(value) && !(value as string).includes("\0")
const storeName: Validator = (value) =>
  typeof value === "string" && value.length > 0 && value.length <= maxShortString && /^[a-zA-Z0-9._-]+$/.test(value)
const plainObject: Validator = (value) =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype

const exact =
  (...validators: Validator[]) =>
  (args: unknown[]) =>
    args.length === validators.length && validators.every((validator, index) => validator(args[index]))
const none = exact()
const optional = (validator: Validator) => (args: unknown[]) =>
  args.length === 0 || (args.length === 1 && (args[0] === undefined || validator(args[0])))

function objectWith(value: unknown, allowed: string[], validators: Record<string, Validator>) {
  if (!plainObject(value)) return false
  const record = value as Record<string, unknown>
  if (Object.keys(record).some((key) => !allowed.includes(key))) return false
  return Object.entries(validators).every(([key, validator]) => record[key] === undefined || validator(record[key]))
}

const pickerOptions: Validator = (value) =>
  objectWith(value, ["multiple", "title", "defaultPath", "extensions"], {
    multiple: boolean,
    title: string(),
    defaultPath: path,
    extensions: (extensions) =>
      Array.isArray(extensions) && extensions.length <= 32 && extensions.every((extension) => string(32)(extension)),
  })

const savePickerOptions: Validator = (value) =>
  objectWith(value, ["title", "defaultPath"], {
    title: string(),
    defaultPath: path,
  })

const titlebarTheme: Validator = (value) =>
  objectWith(value, ["mode", "scheme"], {
    mode: (mode) => mode === "light" || mode === "dark",
    scheme: (scheme) => scheme === "system" || scheme === "light" || scheme === "dark",
  })

const fatalRendererError: Validator = (value) =>
  objectWith(value, ["error", "url", "version", "platform", "os"], {
    error: string(maxContentString),
    url: string(maxPathString),
    version: string(),
    platform: string(),
    os: string(),
  }) && typeof (value as Record<string, unknown>).error === "string"
const productMetrics = new Set([
  "activation.completed",
  "task.completed",
  "task.failed",
  "billing.opened",
  "support.opened",
])
const productMetric: Validator = (value) => typeof value === "string" && productMetrics.has(value)

const menuActions = new Set([
  "app.checkForUpdates",
  "app.relaunch",
  "edit.undo",
  "edit.redo",
  "edit.cut",
  "edit.copy",
  "edit.paste",
  "edit.delete",
  "edit.selectAll",
  "view.reload",
  "view.toggleDevTools",
  "view.resetZoom",
  "view.zoomIn",
  "view.zoomOut",
  "view.toggleFullscreen",
  "window.new",
  "window.close",
  "window.minimize",
  "window.toggleMaximize",
])

const noArguments = [
  "kill-sidecar",
  "await-initialization",
  "consume-initial-deep-links",
  "swiftscale-auth-status",
  "swiftscale-auth-login",
  "swiftscale-auth-logout",
  "get-default-server-url",
  "is-first-launch-onboarding-pending",
  "is-old-layout-eligible",
  "updater-subscribe",
  "updater-unsubscribe",
  "updater-check",
  "updater-install",
  "export-debug-logs",
  "delete-local-data",
  "read-clipboard-image",
  "get-window-id",
  "get-window-focused",
  "get-window-fullscreen",
  "set-window-focus",
  "show-window",
  "relaunch",
  "get-zoom-factor",
  "get-pinch-zoom-enabled",
  "get-product-analytics-enabled",
] as const

const contracts: Record<string, (args: unknown[]) => boolean> = Object.fromEntries(
  noArguments.map((channel) => [channel, none]),
)

Object.assign(contracts, {
  "swiftscale-entitlements": exact(boolean),
  "set-default-server-url": exact(nullable(string(maxPathString))),
  "finish-first-launch-onboarding": exact(boolean),
  "check-app-exists": exact(string()),
  "set-background-color": exact((value) => typeof value === "string" && value.length <= 128 && !/[\0\r\n]/.test(value)),
  "set-force-focus": exact(boolean),
  "record-fatal-renderer-error": exact(fatalRendererError),
  "record-product-metric": exact(productMetric),
  "set-product-analytics-enabled": exact(boolean),
  "set-native-translations": exact(plainObject),
  "store-get": exact(storeName, string(maxPathString)),
  "store-set": exact(storeName, string(maxPathString), string(maxContentString)),
  "store-delete": exact(storeName, string(maxPathString)),
  "store-clear": exact(storeName),
  "store-keys": exact(storeName),
  "store-length": exact(storeName),
  "draft-get": exact(string(maxPathString)),
  "draft-set": exact(string(maxPathString), string(maxContentString)),
  "draft-delete": exact(string(maxPathString)),
  "draft-blob-put": exact((value) => value instanceof ArrayBuffer && value.byteLength <= maxBlobBytes),
  "draft-blob-get": exact(string()),
  "open-directory-picker": optional(pickerOptions),
  "open-file-picker": optional(pickerOptions),
  "read-picked-file": exact(string(), path),
  "release-picked-files": exact(string()),
  "save-file-picker": optional(savePickerOptions),
  "open-external": exact(string(maxPathString)),
  "open-local-file": exact(string(maxPathString)),
  "open-path": (args: unknown[]) =>
    (args.length === 1 || args.length === 2) && path(args[0]) && (args[1] === undefined || string()(args[1])),
  "reveal-path": exact(path),
  "set-zoom-factor": exact((value) => finiteNumber(value) && (value as number) >= 0.2 && (value as number) <= 10),
  "set-pinch-zoom-enabled": exact(boolean),
  "set-titlebar": exact(titlebarTheme),
  "run-desktop-menu-action": exact((value) => typeof value === "string" && menuActions.has(value)),
})

export function assertIpcArguments(channel: string, args: unknown[]) {
  const validate = contracts[channel]
  if (!validate || !validate(args)) throw new Error(`Invalid IPC request: ${channel}`)
}

export function isKnownIpcChannel(channel: string) {
  return channel in contracts
}
