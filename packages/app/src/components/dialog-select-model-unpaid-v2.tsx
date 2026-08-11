import { DialogBody, DialogHeader, DialogTitle, DialogV2 } from "@opencode-ai/ui/v2/dialog-v2"
import { Icon } from "@opencode-ai/ui/v2/icon"
import { Tag } from "@opencode-ai/ui/v2/badge-v2"
import { TooltipV2 } from "@opencode-ai/ui/v2/tooltip-v2"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { createMemo, createSignal, onCleanup, onMount, type Component, For, Show } from "solid-js"
import { useLocal } from "@/context/local"
import { useLanguage } from "@/context/language"
import { usePlatform, type SwiftScaleAuthStatus, type SwiftScaleEntitlements } from "@/context/platform"
import { useProviders } from "@/hooks/use-providers"
import { useSDK } from "@/context/sdk"
import { DialogSwiftScaleAccount } from "./dialog-swiftscale-account"
import { ModelTooltip } from "./model-tooltip"
import {
  filterSwiftScaleModelsByProducts,
  isCommercialSwiftScaleModel,
  swiftScaleProductAccess,
} from "./swiftscale-model-access"

type ModelState = ReturnType<typeof useLocal>["model"]
const displayModelName = (name: string) => name.replace(/\s+(?:\(free\)|free)$/i, "")
const commercialModels = [
  { id: "gpt-5.4", name: "GPT-5.4" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" },
] as const

export const DialogSelectModelUnpaidV2: Component<{ model?: ModelState }> = (props) => {
  const local = useLocal()
  const model = props.model ?? local.model
  const dialog = useDialog()
  const language = useLanguage()
  const platform = usePlatform()
  const sdk = useSDK()
  const providers = useProviders(() => sdk().directory)
  const [accountStatus, setAccountStatus] = createSignal<SwiftScaleAuthStatus>({ state: "signed_out" })
  const [entitlements, setEntitlements] = createSignal<SwiftScaleEntitlements>()
  const modelKey = (item: ReturnType<ModelState["list"]>[number]) => `${item.provider.id}:${item.id}`
  const currentKey = createMemo(() => {
    const c = model.current()
    return c ? `${c.provider.id}:${c.id}` : undefined
  })
  const swiftscaleModels = createMemo(() => model.list().filter((item) => item.provider.id === "swiftcoder"))
  const access = createMemo(() => {
    const status = accountStatus()
    return swiftScaleProductAccess({
      accountPlan: status.state === "signed_in" ? status.account.plan : undefined,
      entitlementProduct: entitlements()?.product,
      products: entitlements()?.products
        ? {
            coding: entitlements()!.products!.coding.enabled,
            apiServices: entitlements()!.products!.apiServices.enabled,
          }
        : undefined,
      providerConnected: providers.connected().some((provider) => provider.id === "swiftcoder"),
    })
  })
  const allowed = (product: "coding" | "apiServices") => new Set(entitlements()?.products?.[product].models ?? [])
  const entitledModels = createMemo(() =>
    filterSwiftScaleModelsByProducts(swiftscaleModels(), entitlements()?.products),
  )
  const swiftModels = createMemo(() => {
    const candidates = entitledModels().filter((item) => !isCommercialSwiftScaleModel(item))
    if (!access().coding || access().apiServices) return candidates
    const models = allowed("coding")
    if (models.size === 0) return candidates.slice(0, 1)
    const filtered = candidates.filter((item) => models.has(item.id))
    return filtered.length > 0 ? filtered : candidates.slice(0, 1)
  })
  const availableCommercialModels = createMemo(() => {
    const candidates = entitledModels().filter(isCommercialSwiftScaleModel)
    const models = allowed("apiServices")
    if (models.size === 0) return candidates
    return candidates.filter((item) => models.has(item.id))
  })
  const sectionTitle = createMemo(() => (access().coding && !access().apiServices ? "SwiftScale" : "Swift Models"))

  const selectModel = (item: ReturnType<ModelState["list"]>[number]) => {
    model.set({ modelID: item.id, providerID: item.provider.id }, { recent: true })
    dialog.close()
  }
  const openAccount = () => {
    void dialog.show(() => <DialogSwiftScaleAccount refreshEntitlements />)
  }

  const updateAccount = (status: SwiftScaleAuthStatus) => {
    setAccountStatus(status)
    if (status.state !== "signed_in") return setEntitlements(undefined)
    void platform.swiftScaleAuth
      ?.entitlements()
      .then(setEntitlements)
      .catch(() => setEntitlements(undefined))
  }

  onMount(() => {
    const auth = platform.swiftScaleAuth
    if (!auth) return
    void auth.status().then(updateAccount)
    const unsubscribe = auth.subscribe(updateAccount)
    onCleanup(unsubscribe)
  })

  const modelOption = (item: ReturnType<ModelState["list"]>[number]) => (
    <TooltipV2
      class="w-full"
      placement="right-start"
      gutter={6}
      openDelay={0}
      contentStyle={{ "font-family": "var(--v2-font-family-sans)" }}
      value={
        <ModelTooltip model={{ ...item, name: displayModelName(item.name) }} latest={item.latest} free={false} v2 />
      }
    >
      <button
        type="button"
        class="flex w-full scroll-my-3.5 flex-row items-center gap-1.5 rounded-md px-3 py-2 text-left text-[13px] font-[530] leading-5 tracking-[-0.04px] text-v2-text-text-base [font-family:var(--v2-font-family-sans)] [font-variation-settings:'slnt'_0] hover:bg-v2-overlay-simple-overlay-hover focus:bg-v2-overlay-simple-overlay-hover focus:outline-none"
        onClick={() => selectModel(item)}
      >
        <span class="min-w-0 truncate">{displayModelName(item.name)}</span>
        <Show when={item.latest}>
          <Tag class="shrink-0">{language.t("model.tag.latest")}</Tag>
        </Show>
        <Show when={currentKey() === modelKey(item)}>
          <Icon name="check" class="ml-auto size-4 shrink-0 text-v2-icon-icon-base" />
        </Show>
      </button>
    </TooltipV2>
  )

  // Focus starts on the dialog's close button, outside the list, so listen at the
  // document level while the dialog is mounted instead of on the list container.
  let listEl: HTMLDivElement | undefined
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
      if (!listEl) return
      const buttons = Array.from(listEl.querySelectorAll<HTMLButtonElement>("button"))
      if (buttons.length === 0) return
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const next =
        index < 0 ? (e.key === "ArrowDown" ? 0 : buttons.length - 1) : index + (e.key === "ArrowDown" ? 1 : -1)
      buttons[(next + buttons.length) % buttons.length]?.focus()
      e.preventDefault()
    }
    document.addEventListener("keydown", handleKeyDown)
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown))
  })

  return (
    <DialogV2
      fit
      containerClass="!h-auto max-h-[calc(100vh_-_16px)] !w-[min(calc(100vw_-_16px),640px)]"
      class="[font-family:var(--v2-font-family-sans)] [&_[data-slot=dialog-header]]:!px-5 [&_[data-slot=dialog-header-title]]:!text-[15px] [&_[data-slot=dialog-header-title]]:!tracking-[-0.13px]"
    >
      <DialogHeader closeLabel={language.t("common.close")}>
        <DialogTitle>{language.t("dialog.model.select.title")}</DialogTitle>
      </DialogHeader>
      <DialogBody class="max-h-[calc(100vh_-_68px)] min-h-0 flex-none gap-0 overflow-y-auto px-2 pb-2">
        <div ref={listEl} class="flex min-h-0 flex-col">
          <div data-section="swiftscale-models" class="flex w-full flex-col items-start pb-3">
            <div class="flex h-8 w-full flex-none select-none flex-row items-center px-3 pb-2">
              <div class="flex h-5 items-center text-[13px] font-[440] leading-5 tracking-[-0.04px] text-v2-text-text-muted [font-family:var(--v2-font-family-sans)] [font-variant-numeric:tabular-nums] [font-variation-settings:'slnt'_0]">
                {sectionTitle()}
              </div>
            </div>
            <For each={swiftModels()}>{modelOption}</For>
          </div>

          <Show when={access().apiServices || !access().known}>
            <div data-section="commercial-models" class="flex w-full flex-col items-start pb-3">
              <div class="flex h-8 w-full flex-none select-none flex-row items-center px-3 pb-2">
                <div class="flex h-5 items-center text-[13px] font-[440] leading-5 tracking-[-0.04px] text-v2-text-text-muted [font-family:var(--v2-font-family-sans)] [font-variant-numeric:tabular-nums] [font-variation-settings:'slnt'_0]">
                  Commercial Models
                </div>
              </div>
              <For each={availableCommercialModels()}>{modelOption}</For>
              <Show when={!access().known}>
                <For each={commercialModels}>
                  {(entry) => (
                    <button
                      type="button"
                      class="flex w-full scroll-my-3.5 flex-row items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-[530] leading-5 tracking-[-0.04px] text-v2-text-text-muted [font-family:var(--v2-font-family-sans)] [font-variation-settings:'slnt'_0] hover:bg-v2-overlay-simple-overlay-hover focus:bg-v2-overlay-simple-overlay-hover focus:outline-none"
                      onClick={openAccount}
                    >
                      <span class="min-w-0 flex-1 truncate">{entry.name}</span>
                      <Tag class="shrink-0">API Services</Tag>
                    </button>
                  )}
                </For>
              </Show>
            </div>
          </Show>
        </div>
      </DialogBody>
    </DialogV2>
  )
}
