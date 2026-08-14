import { describe, expect, test } from "bun:test"
import { DESKTOP_MENU } from "./desktop-menu"

describe("desktop menu", () => {
  test("exports logs through the desktop command registry", () => {
    const items = DESKTOP_MENU.flatMap((menu) => menu.items ?? []).filter(
      (item) => item.type === "item" && item.labelKey === "desktop.menu.exportLogs",
    )

    expect(items).toHaveLength(2)
    expect(items.every((item) => item.type === "item" && item.command === "logs.export" && !item.action)).toBe(true)
  })

  test("provides translated labels for role-backed entries", () => {
    const windowMenu = DESKTOP_MENU.find((menu) => menu.role === "windowMenu")
    const roleItems = DESKTOP_MENU.flatMap((menu) => menu.items ?? []).filter(
      (item) => item.type === "item" && item.role && item.labelKey,
    )

    expect(windowMenu?.labelKey).toBe("desktop.menu.window")
    expect(roleItems.length).toBeGreaterThan(0)
  })

  test("reuses the sidebar account dialog from the macOS settings entry", () => {
    const appMenu = DESKTOP_MENU.find((menu) => menu.id === "app")
    const settings = appMenu?.items?.find(
      (item) => item.type === "item" && item.labelKey === "desktop.menu.settings",
    )

    expect(settings).toMatchObject({ type: "item", command: "settings.account" })
  })

  test("keeps the Windows settings entry on the general settings dialog", () => {
    const fileMenu = DESKTOP_MENU.find((menu) => menu.id === "file")
    const settings = fileMenu?.items?.find(
      (item) => item.type === "item" && item.labelKey === "desktop.menu.settings",
    )

    expect(settings).toMatchObject({ type: "item", command: "settings.open" })
  })
})
