import { beforeEach, describe, expect, test } from "bun:test"

const src = await Bun.file(new URL("../public/swiftcoder-theme-preload.js", import.meta.url)).text()

const run = () => Function(src)()

beforeEach(() => {
  document.head.innerHTML = ""
  document.documentElement.removeAttribute("data-theme")
  document.documentElement.removeAttribute("data-color-scheme")
  localStorage.clear()
  Object.defineProperty(window, "matchMedia", {
    value: () =>
      ({
        matches: false,
      }) as MediaQueryList,
    configurable: true,
  })
})

describe("theme preload", () => {
  test("preserves preferences from earlier SwiftCoder storage keys", () => {
    localStorage.setItem("opencode-theme-id", "nightowl")
    localStorage.setItem("opencode-color-scheme", "dark")
    localStorage.setItem("opencode-theme-css-dark", "--background-base:#123;")

    run()

    expect(localStorage.getItem("swiftcoder-theme-id")).toBe("nightowl")
    expect(localStorage.getItem("opencode-theme-id")).toBe("nightowl")
    expect(document.documentElement.dataset.colorScheme).toBe("dark")
    expect(document.getElementById("swiftcoder-theme-preload")?.textContent).toContain("--background-base:#123;")
  })

  test("never overwrites current preferences with earlier storage values", () => {
    localStorage.setItem("opencode-theme-id", "nightowl")
    localStorage.setItem("swiftcoder-theme-id", "oc-2")

    run()

    expect(localStorage.getItem("swiftcoder-theme-id")).toBe("oc-2")
    expect(document.documentElement.dataset.theme).toBe("oc-2")
  })

  test("migrates legacy oc-1 to oc-2 before mount", () => {
    localStorage.setItem("swiftcoder-theme-id", "oc-1")
    localStorage.setItem("swiftcoder-theme-css-light", "--background-base:#fff;")
    localStorage.setItem("swiftcoder-theme-css-dark", "--background-base:#000;")

    run()

    expect(document.documentElement.dataset.theme).toBe("oc-2")
    expect(document.documentElement.dataset.colorScheme).toBe("light")
    expect(localStorage.getItem("swiftcoder-theme-id")).toBe("oc-2")
    expect(localStorage.getItem("swiftcoder-theme-css-light")).toBeNull()
    expect(localStorage.getItem("swiftcoder-theme-css-dark")).toBeNull()
    expect(document.getElementById("swiftcoder-theme-preload")).toBeNull()
  })

  test("keeps cached css for non-default themes", () => {
    localStorage.setItem("swiftcoder-theme-id", "nightowl")
    localStorage.setItem("swiftcoder-theme-css-light", "--background-base:#fff;")

    run()

    expect(document.documentElement.dataset.theme).toBe("nightowl")
    expect(document.getElementById("swiftcoder-theme-preload")?.textContent).toContain("--background-base:#fff;")
  })
})
