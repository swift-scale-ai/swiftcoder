import { getComponentCatalogue } from "@opentui/solid/components"
import { registerSpinner } from "opentui-spinner/solid"

export function registerSwiftCoderSpinner() {
  if (!getComponentCatalogue().spinner) registerSpinner()
}
