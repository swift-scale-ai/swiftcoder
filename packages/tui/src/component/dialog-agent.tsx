import { createMemo } from "solid-js"
import { useLocal } from "../context/local"
import { DialogSelect } from "../ui/dialog-select"
import { useDialog } from "../ui/dialog"

export function agentOptions(list: { name: string; native?: boolean; description?: string }[]) {
  return list.map((item) => ({
    value: item.name,
    title: item.name,
    description: item.native ? "native" : item.description,
  }))
}

export function DialogAgent() {
  const local = useLocal()
  const dialog = useDialog()

  const options = createMemo(() => agentOptions(local.agent.list()))

  return (
    <DialogSelect
      title="Select agent"
      current={local.agent.current()?.name}
      options={options()}
      onSelect={(option) => {
        local.agent.set(option.value)
        dialog.clear()
      }}
    />
  )
}
