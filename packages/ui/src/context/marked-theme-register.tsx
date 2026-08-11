import { registerCustomTheme } from "@pierre/diffs"
import { SwiftCoderTheme } from "./marked-theme"

let registered = false

export function registerSwiftCoderTheme() {
  if (registered) return
  registered = true
  registerCustomTheme("SwiftCoder", () => Promise.resolve(SwiftCoderTheme))
}
