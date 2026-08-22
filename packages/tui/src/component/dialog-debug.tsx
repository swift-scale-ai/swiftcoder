import { TextAttributes } from "@opentui/core"
import { createMemo, createSignal, For } from "solid-js"
import { InstallationChannel, InstallationVersion } from "@swiftscale/core/installation/version"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { useRoute } from "../context/route"
import { useLocal } from "../context/local"
import { useClipboard } from "../context/clipboard"
import { useToast } from "../ui/toast"
import { useBindings } from "../keymap"
import { describeOS, describeTerminal } from "../util/system"

export function createDebugEntries(input: {
  version: string
  channel: string
  date: string
  os: string
  terminal: string
  sessionID?: string
  model?: { providerID: string; modelID: string }
}) {
  return [
    { label: "Version", value: `${input.version} (${input.channel})` },
    { label: "Date", value: input.date },
    { label: "OS", value: input.os },
    { label: "Terminal", value: input.terminal },
    { label: "Session ID", value: input.sessionID ?? "n/a" },
    { label: "Model", value: input.model ? `${input.model.providerID}/${input.model.modelID}` : "n/a" },
  ]
}

export function DialogDebug() {
  const { theme } = useTheme()
  const dialog = useDialog()
  const route = useRoute()
  const local = useLocal()
  const clipboard = useClipboard()
  const toast = useToast()
  const [copied, setCopied] = createSignal(false)

  dialog.setSize("large")

  const entries = createMemo(() => {
    const model = local.model.current()
    return createDebugEntries({
      version: InstallationVersion,
      channel: InstallationChannel,
      date: new Date().toISOString(),
      os: describeOS(),
      terminal: describeTerminal(),
      sessionID: route.data.type === "session" ? route.data.sessionID : undefined,
      model,
    })
  })

  const copy = () => {
    const text = entries()
      .map((entry) => `${entry.label}: ${entry.value}`)
      .join("\n")
    void clipboard
      .write?.(text)
      .then(() => {
        setCopied(true)
        toast.show({ message: "Debug info copied to clipboard", variant: "info" })
      })
      .catch(toast.error)
  }

  useBindings(() => ({
    bindings: [{ key: "return", desc: "Copy debug info", group: "Dialog", cmd: copy }],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Debug
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      {/* No click-to-copy here: releasing a mouse selection must trigger the
          global copy-on-select so users can copy a single value, e.g. the session id. */}
      <box>
        <For each={entries()}>
          {(entry) => (
            <box flexDirection="row" gap={1}>
              <text flexShrink={0} fg={theme.textMuted}>
                {entry.label.padEnd(10)}
              </text>
              <text fg={theme.text} wrapMode="word">
                {entry.value}
              </text>
            </box>
          )}
        </For>
      </box>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.textMuted}>Share this when reporting an issue.</text>
        <text onMouseUp={copy}>
          <span style={{ fg: copied() ? theme.success : theme.text }}>
            <b>{copied() ? "✓ copied" : "copy"}</b>{" "}
          </span>
          <span style={{ fg: theme.textMuted }}>enter</span>
        </text>
      </box>
    </box>
  )
}
