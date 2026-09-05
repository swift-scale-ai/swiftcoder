import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { _electron as electron } from "@playwright/test"

const root = resolve(import.meta.dirname, "..")
const appPath = join(root, "packages/desktop")
const executablePath = join(appPath, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron")
const evidenceDir = resolve(root, "../swiftcoder-docs/evidence/phase3")
const phase4EvidenceDir = resolve(root, "../swiftcoder-docs/evidence/phase4")
const budgets = {
  interactiveMs: 8_000,
  workingSetMiB: 1_400,
  largeWorkspaceSearchMs: 5_000,
}
const viewports = [
  { width: 900, height: 600 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
]

await mkdir(evidenceDir, { recursive: true })
await mkdir(phase4EvidenceDir, { recursive: true })

const largeProject = await mkdtemp(join(tmpdir(), "swiftcoder-phase3-large-"))
const fileCount = 100_000
const directoryCount = 100
for (let directory = 0; directory < directoryCount; directory++) {
  const path = join(largeProject, `group-${String(directory).padStart(3, "0")}`)
  await mkdir(path)
  const writes = []
  for (let index = directory; index < fileCount; index += directoryCount) {
    writes.push(writeFile(join(path, `file-${String(index).padStart(6, "0")}.ts`), "export const value = 1\n"))
    if (writes.length < 250) continue
    await Promise.all(writes.splice(0))
  }
  await Promise.all(writes)
}

const started = performance.now()
let electronApp
let failed = false
try {
  electronApp = await electron.launch({
    executablePath,
    args: [appPath],
    cwd: root,
    env: {
      ...process.env,
      SWIFTCODER_CHANNEL: "prod",
      SWIFTCODER_VERSION: "0.1.0-phase3-runtime",
      SWIFTCODER_TEST_ONBOARDING: "1",
      SWIFTCODER_TEST_PROJECT_DIR: largeProject,
      SWIFTCODER_SKIP_NOTARIZE: "1",
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
    },
    timeout: 60_000,
  })
  const page = await electronApp.firstWindow({ timeout: 60_000 })
  await page.waitForLoadState("domcontentloaded")
  await page.waitForFunction(
    () => Boolean(document.querySelector("#root")?.children.length) && !document.querySelector(".animate-pulse"),
    undefined,
    { timeout: 60_000 },
  )
  await page.waitForTimeout(500)

  const interactiveMs = performance.now() - started
  const processes = await electronApp.evaluate(({ app }) =>
    app.getAppMetrics().map((entry) => ({
      type: entry.type,
      workingSetMiB: entry.memory.workingSetSize / 1024,
      peakWorkingSetMiB: entry.memory.peakWorkingSetSize / 1024,
    })),
  )
  const workingSetMiB = processes.reduce((total, process) => total + process.workingSetMiB, 0)

  const largeWorkspace = await page.evaluate(
    async ({ directory, timeoutMs }) => {
      const server = await window.api.awaitInitialization()
      const query = new URLSearchParams({ directory, query: "file-099999", dirs: "false" })
      const headers = new Headers()
      if (server.username && server.password) {
        headers.set("Authorization", `Basic ${btoa(`${server.username}:${server.password}`)}`)
      }
      const started = performance.now()
      let status = 0
      let results = []
      let attempts = 0
      do {
        attempts++
        const response = await fetch(`${server.url}/find/file?${query}`, { headers })
        status = response.status
        const body = await response.json()
        results = Array.isArray(body) ? body : []
        if (results.length > 0) break
        await new Promise((resolve) => setTimeout(resolve, 100))
      } while (performance.now() - started < timeoutMs)
      return {
        durationMs: performance.now() - started,
        status,
        results,
        attempts,
      }
    },
    { directory: largeProject, timeoutMs: budgets.largeWorkspaceSearchMs },
  )
  const largeWorkspaceValid =
    largeWorkspace.status === 200 &&
    largeWorkspace.durationMs <= budgets.largeWorkspaceSearchMs &&
    largeWorkspace.results.some((path) => path.endsWith("file-099999.ts"))
  console.log(
    `${largeWorkspaceValid ? "PASS" : "FAIL"} 100k-file search: ` +
      `${largeWorkspace.durationMs.toFixed(1)} ms / ${budgets.largeWorkspaceSearchMs} ms`,
  )
  if (!largeWorkspaceValid) failed = true

  for (const labels of [["New task", "New session"], ["Projects"], ["Chat"], ["SwiftCoder Developer"]]) {
    const visible = await Promise.all(
      labels.map((label) => page.getByText(label, { exact: true }).first().isVisible().catch(() => false)),
    ).then((results) => results.some(Boolean))
    console.log(`${visible ? "PASS" : "FAIL"} home signal: ${labels.join(" or ")}`)
    if (!visible) failed = true
  }
  const accountSummary = page.getByText("SwiftCoder Developer", { exact: true }).first()
  const accountSummaryVisible = await accountSummary.isVisible()
  console.log(`${accountSummaryVisible ? "PASS" : "FAIL"} home account summary accessibility`)
  if (!accountSummaryVisible) failed = true
  if (accountSummaryVisible) {
    await accountSummary.click()
    await page.waitForTimeout(750)
  }
  const accountSettingsVisible =
    accountSummaryVisible &&
    (await Promise.all(
      ["Account & plan", "SwiftScale account"].map((label) =>
        page.getByText(label, { exact: true }).first().isVisible().catch(() => false),
      ),
    ).then((results) => results.some(Boolean)))
  console.log(`${accountSettingsVisible ? "PASS" : "FAIL"} account and plan settings`)
  if (!accountSettingsVisible) failed = true
  if (accountSummaryVisible) await page.keyboard.press("Escape")

  const checks = [
    ["interactive", interactiveMs, budgets.interactiveMs, "ms"],
    ["working set", workingSetMiB, budgets.workingSetMiB, "MiB"],
  ]
  for (const [name, actual, limit, unit] of checks) {
    const status = actual <= limit ? "PASS" : "FAIL"
    console.log(`${status} ${name}: ${actual.toFixed(1)} ${unit} / ${limit} ${unit}`)
    if (status === "FAIL") failed = true
  }

  const layouts = []
  for (const viewport of viewports) {
    await electronApp.evaluate(({ BrowserWindow }, size) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win) throw new Error("SwiftCoder window not found")
      win.setContentSize(size.width, size.height)
      win.center()
    }, viewport)
    await page.waitForTimeout(250)

    const layout = await page.evaluate(() => {
      const documentElement = document.documentElement
      const body = document.body
      return {
        width: documentElement.clientWidth,
        height: documentElement.clientHeight,
        horizontalOverflow: Math.max(documentElement.scrollWidth, body.scrollWidth) - documentElement.clientWidth,
        verticalOverflow: Math.max(documentElement.scrollHeight, body.scrollHeight) - documentElement.clientHeight,
        rootChildren: document.querySelector("#root")?.children.length ?? 0,
      }
    })
    const valid =
      Math.abs(layout.width - viewport.width) <= 2 &&
      Math.abs(layout.height - viewport.height) <= 2 &&
      layout.horizontalOverflow <= 1 &&
      layout.verticalOverflow <= 1 &&
      layout.rootChildren > 0
    console.log(
      `${valid ? "PASS" : "FAIL"} layout ${viewport.width}x${viewport.height}: ` +
        `${layout.width}x${layout.height}, overflow ${layout.horizontalOverflow}x${layout.verticalOverflow}`,
    )
    if (!valid) failed = true
    layouts.push({ requested: viewport, actual: layout, valid })
    await page.screenshot({
      path: join(evidenceDir, `runtime-${viewport.width}x${viewport.height}.png`),
      animations: "disabled",
    })
  }

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("swiftcoder:deep-link", {
        detail: { urls: ["swiftcoder://billing/complete?result=success"] },
      }),
    )
  })
  await page.getByText("Checking your SwiftScale plan", { exact: true }).waitFor()
  for (const label of [
    "SwiftCoder Lite",
    "Usage",
    "2 concurrent tasks",
    "Service Operational",
    "Request ID: req_phase4_runtime",
    "Manage billing",
    "Support",
  ]) {
    const visible = await page.getByText(label, { exact: true }).first().isVisible()
    console.log(`${visible ? "PASS" : "FAIL"} account signal: ${label}`)
    if (!visible) failed = true
  }
  await page.screenshot({ path: join(phase4EvidenceDir, "account-entitlements-1280x800.png"), animations: "disabled" })
  await page.keyboard.press("Escape")

  await electronApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send("menu-command", "settings.open")
  })
  const supportSection = page.getByText("Support and privacy", { exact: true })
  await supportSection.scrollIntoViewIfNeeded()
  const supportSignals = [
    "Privacy policy",
    "Share product analytics",
    "Open-source licenses",
    "Diagnostic bundle",
    "Delete local data",
  ]
  for (const label of supportSignals) {
    const visible = await page.getByText(label, { exact: true }).first().isVisible()
    console.log(`${visible ? "PASS" : "FAIL"} support signal: ${label}`)
    if (!visible) failed = true
  }
  await page.getByRole("button", { name: "Delete local data", exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(evidenceDir, "settings-support-1280x800.png"), animations: "disabled" })
  await page.keyboard.press("Escape")

  const newTask = page.getByRole("button", { name: /^(New task|New session)$/ }).last()
  await newTask.click()
  await page.waitForTimeout(500)
  const composerVisible = await page
    .locator('[data-component="prompt-input"]')
    .first()
    .isVisible()
    .catch(() => false)
  console.log(`${composerVisible ? "PASS" : "FAIL"} new session composer`)
  if (!composerVisible) failed = true
  const duplicateNewSessionTitle = await page
    .locator("header")
    .getByText("New session", { exact: true })
    .isVisible()
    .catch(() => false)
  console.log(`${!duplicateNewSessionTitle ? "PASS" : "FAIL"} no duplicate new session title`)
  if (duplicateNewSessionTitle) failed = true

  for (const labels of [
    ["Context", "Review"],
    ["Workspace", "Last turn changes"],
    ["Changes", "No tracked changes"],
    ["Tasks", "Create Git repository"],
  ]) {
    const visible = await Promise.all(
      labels.map((label) => page.getByText(label, { exact: true }).first().isVisible().catch(() => false)),
    ).then((results) => results.some(Boolean))
    console.log(`${visible ? "PASS" : "FAIL"} session signal: ${labels.join(" or ")}`)
    if (!visible) failed = true
  }

  const sessionLayouts = []
  for (const viewport of viewports) {
    await electronApp.evaluate(({ BrowserWindow }, size) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win) throw new Error("SwiftCoder window not found")
      win.setContentSize(size.width, size.height)
      win.center()
    }, viewport)
    await page.waitForTimeout(250)
    const layout = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      horizontalOverflow:
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
        document.documentElement.clientWidth,
      verticalOverflow:
        Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) -
        document.documentElement.clientHeight,
    }))
    const valid =
      Math.abs(layout.width - viewport.width) <= 2 &&
      Math.abs(layout.height - viewport.height) <= 2 &&
      layout.horizontalOverflow <= 1 &&
      layout.verticalOverflow <= 1
    console.log(
      `${valid ? "PASS" : "FAIL"} session layout ${viewport.width}x${viewport.height}: ` +
        `${layout.width}x${layout.height}, overflow ${layout.horizontalOverflow}x${layout.verticalOverflow}`,
    )
    if (!valid) failed = true
    sessionLayouts.push({ requested: viewport, actual: layout, valid })
    await page.screenshot({
      path: join(evidenceDir, `new-session-${viewport.width}x${viewport.height}.png`),
      animations: "disabled",
    })
  }

  await electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) throw new Error("SwiftCoder window not found")
    win.setContentSize(1280, 800)
    win.center()
  })
  await page.evaluate(() => window.api.killSidecar())
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.getByText(/Could not reach/).waitFor({ state: "visible", timeout: 15_000 })
  const retryingVisible = await page.getByText("Retrying automatically...", { exact: true }).isVisible()
  const offlineLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
    horizontalOverflow:
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
    verticalOverflow:
      Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) -
      document.documentElement.clientHeight,
  }))
  const offlineValid = retryingVisible && offlineLayout.horizontalOverflow <= 1 && offlineLayout.verticalOverflow <= 1
  console.log(`${offlineValid ? "PASS" : "FAIL"} offline state with automatic retry`)
  if (!offlineValid) failed = true
  await page.screenshot({ path: join(evidenceDir, "offline-1280x800.png"), animations: "disabled" })

  await writeFile(
    join(evidenceDir, "runtime-metrics.json"),
    `${JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        interactiveMs,
        workingSetMiB,
        largeWorkspace: { fileCount, ...largeWorkspace, valid: largeWorkspaceValid },
        processes,
        budgets,
        layouts,
        sessionLayouts,
        offline: { retryingVisible, layout: offlineLayout, valid: offlineValid },
      },
      null,
      2,
    )}\n`,
  )
} finally {
  await electronApp?.close()
  await rm(largeProject, { recursive: true, force: true })
}

if (failed) process.exit(1)
