import { ImagePreview } from "@opencode-ai/ui/image-preview"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import type { ReferenceInfo } from "@opencode-ai/sdk/v2/client"
import { createEffect, createMemo, createSignal, For, on, Show } from "solid-js"
import type { PromptInputProps } from "@/components/prompt-input/contracts"
import { normalizePromptHistoryEntry, promptLength, type PromptHistoryComment } from "@/components/prompt-input/history"
import { createPersistedPromptInputHistory } from "@/components/prompt-input/history-store"
import { promptDesignPlaceholder, promptPlaceholder } from "@/components/prompt-input/placeholder"
import { createPromptSubmit } from "@/components/prompt-input/submit"
import { selectionFromLines, type SelectedLineRange, useFile } from "@/context/file"
import { useComments } from "@/context/comments"
import { useCommand } from "@/context/command"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { useLocal } from "@/context/local"
import { usePermission } from "@/context/permission"
import { type ImageAttachmentPart, usePrompt } from "@/context/prompt"
import { usePlatform } from "@/context/platform"
import { useSDK } from "@/context/sdk"
import { useSync } from "@/context/sync"
import { createSessionTabs } from "@/pages/session/helpers"
import { showToast } from "@/utils/toast"
import { useSwiftScaleModelEntitlements } from "@/hooks/use-swiftscale-model-entitlements"
import type { ApprovalMode } from "@/context/permission-mode"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Icon } from "@opencode-ai/ui/icon"
import { MenuV2 } from "@opencode-ai/ui/v2/menu-v2"
import {
  PromptInputV2,
  PromptInputV2Select,
  type PromptInputV2Option,
  type PromptInputV2Suggestion,
} from "@opencode-ai/session-ui/v2/prompt-input"
import {
  createPromptInputV2Controller,
  createPromptInputV2State,
  type PromptInputV2Interaction,
} from "@opencode-ai/session-ui/v2/prompt-input/interaction"
import {
  connectedProviderModelFamily,
  preferredSwiftScaleModel,
  sortSwiftScaleModelFamilies,
} from "./swiftscale-model-family"
import {
  effectiveSwiftScaleProductMode,
  filterDirectCommercialModelsByProducts,
  filterSwiftScaleModelsByProductMode,
  isSwiftCoderTextModel,
  selectDirectCommercialTextModels,
} from "./swiftscale-model-access"

export type PromptInputV2ComposerProps = {
  class?: string
  controller: PromptInputV2ComposerController
  borderUnderlay?: boolean
}

export type PromptInputV2ControllerProps = Omit<PromptInputProps, "class" | "submission">
export type PromptInputV2ComposerController = PromptInputV2Interaction & {
  readonly sessionID: string | undefined
  readonly model: PromptInputProps["controls"]["model"]
  readonly productMode: PromptInputV2ModelHierarchyControl
  readonly modelFamily: PromptInputV2ModelHierarchyControl
  readonly modelVersion: PromptInputV2ModelHierarchyControl
}

type PromptInputV2ModelHierarchyControl = {
  options: () => PromptInputV2Option[]
  current: () => string
  onSelect: (value: string) => void
}

export function PromptInputV2Composer(props: PromptInputV2ComposerProps) {
  const command = useCommand()
  const language = useLanguage()
  const permission = usePermission()
  const sdk = useSDK()
  const approvalMode = () => permission.approvalMode(props.controller.sessionID, sdk().directory)

  const approvalOptions = (): Array<{ id: ApprovalMode; label: string; description: string }> => [
    {
      id: "ask",
      label: language.t("permission.mode.ask.title"),
      description: language.t("permission.mode.ask.description"),
    },
    {
      id: "agent",
      label: language.t("permission.mode.agent.title"),
      description: language.t("permission.mode.agent.description"),
    },
    {
      id: "full",
      label: language.t("permission.mode.full.title"),
      description: language.t("permission.mode.full.description"),
    },
  ]

  return (
    <div class="flex flex-col gap-3">
      <PromptInputV2
        controller={props.controller}
        borderUnderlay={props.borderUnderlay}
        class={props.class}
        variantControlVisible={false}
        attachKeybind={command.keybindParts("file.attach")}
        attachShortcut={command.keybind("file.attach")}
        modelControl={
          <Show when={!props.controller.model.loading}>
            <Show when={props.controller.productMode.options().length > 1}>
              <PromptInputV2Select
                title="Choose product mode"
                options={props.controller.productMode.options()}
                current={props.controller.productMode.current()}
                onSelect={props.controller.productMode.onSelect}
              />
            </Show>
            <PromptInputV2Select
              title="Choose model family"
              options={props.controller.modelFamily.options()}
              current={props.controller.modelFamily.current()}
              onSelect={props.controller.modelFamily.onSelect}
            />
            <PromptInputV2Select
              title={language.t("command.model.choose")}
              keybind={command.keybindParts("model.choose")}
              options={props.controller.modelVersion.options()}
              current={props.controller.modelVersion.current()}
              onSelect={props.controller.modelVersion.onSelect}
            />
            <MenuV2 gutter={6} modal={false} placement="top-start">
              <MenuV2.Trigger
                as={ButtonV2}
                variant="ghost-muted"
                size="normal"
                class="max-w-[180px] justify-start ![font-weight:440]"
                aria-label={language.t("permission.mode.title")}
              >
                <Icon name="shield" size="small" />
                <span class="truncate leading-5">
                  {approvalOptions().find((option) => option.id === approvalMode())?.label}
                </span>
                <Icon name="chevron-down" size="small" />
              </MenuV2.Trigger>
              <MenuV2.Portal>
                <MenuV2.Content class="w-[380px] max-w-[calc(100vw-32px)] !p-2">
                  <div class="px-2 pb-2 pt-1 text-12-medium leading-4 text-v2-text-text-muted">
                    {language.t("permission.mode.title")}
                  </div>
                  <MenuV2.RadioGroup
                    class="flex flex-col gap-1"
                    value={approvalMode()}
                    onChange={(mode) =>
                      permission.setApprovalMode(props.controller.sessionID, sdk().directory, mode as ApprovalMode)
                    }
                  >
                    <For each={approvalOptions()}>
                      {(option) => (
                        <MenuV2.RadioItem
                          value={option.id}
                          closeOnSelect
                          class="!h-auto !min-h-[52px] !items-center !px-3 !py-2"
                          classList={{ "text-v2-text-text-critical": option.id === "full" }}
                        >
                          <div class="flex min-w-0 flex-col gap-0.5 whitespace-normal">
                            <span class="text-13-medium leading-4">{option.label}</span>
                            <span class="text-12-regular leading-4 opacity-70">{option.description}</span>
                          </div>
                        </MenuV2.RadioItem>
                      )}
                    </For>
                  </MenuV2.RadioGroup>
                </MenuV2.Content>
              </MenuV2.Portal>
            </MenuV2>
          </Show>
        }
      />
    </div>
  )
}

export function usePromptInputV2Controller(props: PromptInputV2ControllerProps): PromptInputV2ComposerController {
  const sdk = useSDK()
  const local = useLocal()
  const sync = useSync()
  const files = useFile()
  const layout = useLayout()
  const comments = useComments()
  const dialog = useDialog()
  const command = useCommand()
  const permission = usePermission()
  const language = useLanguage()
  const platform = usePlatform()
  const modelEntitlements = useSwiftScaleModelEntitlements()
  const prompt = props.state ?? usePrompt()
  let editor: HTMLDivElement | undefined

  const interaction = createPromptInputV2State()
  const mode = () => interaction[0].mode
  const history = props.history ?? createPersistedPromptInputHistory()
  const tabs = () => props.controls.session.tabs
  const activeFileTab = createSessionTabs({
    tabs,
    pathFromTab: files.pathFromTab,
    normalizeTab: (tab) => (tab.startsWith("file://") ? files.tab(tab) : tab),
  }).activeFileTab
  const recent = createMemo(() => {
    const all = tabs().all()
    const active = activeFileTab()
    const order = active ? [active, ...all.filter((tab) => tab !== active)] : all
    return order.reduce<string[]>((result, tab) => {
      const path = files.pathFromTab(tab)
      if (!path || result.includes(path)) return result
      return [...result, path]
    }, [])
  })
  const info = createMemo(() => (props.controls.session.id ? sync().session.get(props.controls.session.id) : undefined))
  const working = createMemo(() => sync().data.session_working(props.controls.session.id ?? ""))
  const attachments = createMemo(() =>
    prompt.current().filter((part): part is ImageAttachmentPart => part.type === "image"),
  )
  const commentCount = createMemo(() => {
    if (mode() === "shell") return 0
    return prompt.context.items().filter((item) => !!item.comment?.trim()).length
  })
  const blank = createMemo(() => {
    const text = prompt
      .current()
      .map((part) => ("content" in part ? part.content : ""))
      .join("")
    return text.trim().length === 0 && attachments().length === 0 && commentCount() === 0
  })
  const stopping = createMemo(() => working() && blank())
  const placeholder = createMemo(() =>
    promptPlaceholder({
      mode: mode(),
      commentCount: commentCount(),
      example: mode() === "shell" ? "git status" : "",
      suggest: false,
      t: (key, params) => language.t(key as Parameters<typeof language.t>[0], params as never),
    }),
  )
  const designPlaceholder = () =>
    promptDesignPlaceholder(mode(), placeholder(), (key, params) =>
      language.t(key as Parameters<typeof language.t>[0], params as never),
    )

  const historyComments = () => {
    const byID = new Map(comments.all().map((item) => [`${item.file}\n${item.id}`, item] as const))
    return prompt.context.items().flatMap((item) => {
      const comment = item.comment?.trim()
      if (!comment) return []
      const selection = item.commentID ? byID.get(`${item.path}\n${item.commentID}`)?.selection : undefined
      const nextSelection =
        selection ??
        (item.selection
          ? ({ start: item.selection.startLine, end: item.selection.endLine } satisfies SelectedLineRange)
          : undefined)
      if (!nextSelection) return []
      return [
        {
          id: item.commentID ?? item.key,
          path: item.path,
          selection: { ...nextSelection },
          comment,
          time: item.commentID ? (byID.get(`${item.path}\n${item.commentID}`)?.time ?? Date.now()) : Date.now(),
          origin: item.commentOrigin,
          preview: item.preview,
        } satisfies PromptHistoryComment,
      ]
    })
  }
  const restoreHistoryComments = (items: PromptHistoryComment[]) => {
    comments.replace(
      items.map((item) => ({
        id: item.id,
        file: item.path,
        selection: { ...item.selection },
        comment: item.comment,
        time: item.time,
      })),
    )
    prompt.context.replaceComments(
      items.map((item) => ({
        type: "file",
        path: item.path,
        selection: selectionFromLines(item.selection),
        comment: item.comment,
        commentID: item.id,
        commentOrigin: item.origin,
        preview: item.preview,
      })),
    )
  }

  const accepting = createMemo(() => {
    const id = props.controls.session.id
    if (!id) return permission.isAutoAcceptingDirectory(sdk().directory)
    return permission.isAutoAccepting(id, sdk().directory)
  })
  const submission = createPromptSubmit({
    prompt,
    info,
    imageAttachments: attachments,
    commentCount,
    autoAccept: accepting,
    mode,
    working,
    editor: () => editor,
    queueScroll: () => requestAnimationFrame(() => editor?.scrollIntoView({ block: "nearest" })),
    promptLength,
    addToHistory: (value, mode) => controller.addHistory(value, mode),
    resetHistoryNavigation: () => controller.resetHistory(),
    setMode: (next) => controller.dispatch({ type: next === "shell" ? "mode.shell" : "mode.normal" }),
    setPopover: (popover) => {
      if (!popover) controller.dispatch({ type: "popover.close" })
    },
    newSessionWorktree: () => props.newSessionWorktree,
    onNewSessionWorktreeReset: props.onNewSessionWorktreeReset,
    shouldQueue: props.shouldQueue,
    onQueue: props.onQueue,
    onAbort: props.onAbort,
    onSubmit: props.onSubmit,
    model: props.controls.model.selection,
  })

  const referenceDescription = (reference: ReferenceInfo) =>
    reference.source.type === "git" ? reference.source.repository : reference.source.path
  const references = createMemo(() =>
    sync()
      .data.reference.filter((reference) => !reference.hidden)
      .map((reference) => ({
        id: `reference:${reference.name}`,
        kind: "reference" as const,
        label: `@${reference.name}`,
        path: reference.path,
        description: reference.description ?? referenceDescription(reference),
        mention: {
          type: "file" as const,
          path: reference.path,
          content: `@${reference.name}`,
          start: 0,
          end: 0,
          mime: "application/x-directory",
          filename: reference.name,
        },
      })),
  )
  const resources = createMemo(() =>
    Object.values(sync().data.mcp_resource).map((resource) => ({
      id: `resource:${resource.server}:${resource.uri}`,
      kind: "resource" as const,
      label: `@${resource.name}`,
      path: resource.uri,
      description: resource.description,
      mention: {
        type: "file" as const,
        path: resource.uri,
        content: `@${resource.name}`,
        start: 0,
        end: 0,
        mime: resource.mimeType ?? "text/plain",
        filename: resource.name,
        url: resource.uri,
        source: {
          type: "resource" as const,
          text: { value: `@${resource.name}`, start: 0, end: resource.name.length + 1 },
          clientName: resource.server,
          uri: resource.uri,
        },
      },
      resource,
    })),
  )
  const context = createMemo<PromptInputV2Suggestion[]>(() => [
    ...references(),
    ...props.controls.agents.available
      .filter((agent) => !agent.hidden && agent.mode !== "primary")
      .map((agent) => ({
        id: `agent:${agent.name}`,
        kind: "agent" as const,
        label: `@${agent.name}`,
        mention: { type: "agent" as const, name: agent.name, content: `@${agent.name}`, start: 0, end: 0 },
      })),
    ...resources(),
    ...recent().map((path) => ({
      id: `file:${path}`,
      kind: "file" as const,
      label: path,
      path,
      recent: true,
      mention: { type: "file" as const, path, content: `@${path}`, start: 0, end: 0 },
    })),
  ])
  const slashCommands = createMemo(() => [
    ...sync().data.command.map((item) => ({
      id: `custom.${item.name}`,
      trigger: item.name,
      title: item.name,
      description: item.description,
      type: "custom" as const,
    })),
    ...command.options
      .filter((item) => !item.disabled && !item.id.startsWith("suggested.") && item.slash)
      .map((item) => ({
        id: item.id,
        trigger: item.slash!,
        title: item.title,
        description: item.description,
        type: "builtin" as const,
      })),
  ])
  const commands = createMemo<PromptInputV2Suggestion[]>(() =>
    slashCommands().map((item) => ({
      id: item.id,
      kind: "command",
      label: `/${item.trigger}`,
      trigger: item.trigger,
      title: item.title,
      description: item.description,
      keybind: command.keybindParts(item.id),
    })),
  )
  const variants = createMemo(() => ["default", ...props.controls.model.selection.variant.list()])
  const modelKey = (model: { provider: { id: string }; id: string }) => `${model.provider.id}:${model.id}`
  const products = () => modelEntitlements.products()
  const selectedProductMode = createMemo(() =>
    effectiveSwiftScaleProductMode(products(), local.productMode.current()),
  )
  const apiServicesMode = createMemo(() => selectedProductMode() === "api_services")
  const [modelSelectedInComposer, setModelSelectedInComposer] = createSignal(false)
  const explicitModelSelection = () => Boolean(props.controls.session.id) || modelSelectedInComposer()
  createEffect(
    on(
      () => sdk().directory,
      () => setModelSelectedInComposer(false),
      { defer: true },
    ),
  )
  const selectableModels = createMemo(() => {
    const models = props.controls.model.selection.list()
    const isVisible = (model: (typeof models)[number]) =>
      props.controls.model.selection.visible({ providerID: model.provider.id, modelID: model.id })
    const visible = models.filter(isVisible)
    if (modelEntitlements.loading()) return []
    const direct = selectDirectCommercialTextModels(
      filterDirectCommercialModelsByProducts(models, products()),
      isVisible,
    )
    const swiftScale = filterSwiftScaleModelsByProductMode(
      visible.filter((model) => model.provider.id === "swiftcoder").filter(isSwiftCoderTextModel),
      products(),
      selectedProductMode(),
    )
    return [...swiftScale, ...direct]
  })
  const currentFamily = createMemo(() => {
    const current = props.controls.model.selection.current()
    const available = selectableModels()
    const currentAvailable = current && available.some((model) => modelKey(model) === modelKey(current))
    if (current && currentAvailable && (!apiServicesMode() || explicitModelSelection())) {
      return connectedProviderModelFamily(current)
    }
    const preferred = apiServicesMode() ? preferredSwiftScaleModel(available) : undefined
    if (preferred) return connectedProviderModelFamily(preferred)
    return (
      [...new Set(available.map(connectedProviderModelFamily))].sort(sortSwiftScaleModelFamilies)[0] ?? "SwiftScale"
    )
  })
  const familyOptions = createMemo(() =>
    [...new Set(selectableModels().map(connectedProviderModelFamily))]
      .sort(sortSwiftScaleModelFamilies)
      .map((family) => ({ id: family, label: family })),
  )
  const versionModels = createMemo(() => {
    const models = selectableModels()
      .filter((model) => connectedProviderModelFamily(model) === currentFamily())
      .sort((a, b) => a.name.localeCompare(b.name))
    if (!apiServicesMode() || currentFamily() !== "SwiftScale") return models
    const preferred = preferredSwiftScaleModel(models)
    if (!preferred) return models
    return [preferred, ...models.filter((model) => modelKey(model) !== modelKey(preferred))]
  })
  const selectModel = (value: string, explicit = false) => {
    const model = selectableModels().find((item) => modelKey(item) === value)
    if (!model) return
    if (explicit) setModelSelectedInComposer(true)
    props.controls.model.selection.set({ providerID: model.provider.id, modelID: model.id }, { recent: true })
  }
  createEffect(() => {
    if (modelEntitlements.loading()) return
    const available = selectableModels()
    const current = props.controls.model.selection.current()
    const currentAvailable = current && available.some((model) => modelKey(model) === modelKey(current))
    if (currentAvailable && (!apiServicesMode() || explicitModelSelection())) return
    const fallback = apiServicesMode() ? preferredSwiftScaleModel(available) : available[0]
    if (!fallback) return
    if (current && modelKey(current) === modelKey(fallback)) return
    selectModel(modelKey(fallback))
  })
  const modelFamily: PromptInputV2ModelHierarchyControl = {
    options: familyOptions,
    current: currentFamily,
    onSelect: (family) => {
      const current = props.controls.model.selection.current()
      if (current && connectedProviderModelFamily(current) === family) return
      const model = selectableModels()
        .filter((item) => connectedProviderModelFamily(item) === family)
        .sort((a, b) => a.name.localeCompare(b.name))[0]
      if (model) selectModel(modelKey(model), true)
    },
  }
  const productMode: PromptInputV2ModelHierarchyControl = {
    options: () => {
      const value = products()
      if (!value?.coding.enabled || !value.apiServices.enabled) return []
      return [
        { id: "coding", label: "Coding Plan" },
        { id: "api_services", label: "API Services" },
      ]
    },
    current: selectedProductMode,
    onSelect: (value) => {
      if (value !== "coding" && value !== "api_services") return
      setModelSelectedInComposer(false)
      local.productMode.set(value)
    },
  }
  const modelVersion: PromptInputV2ModelHierarchyControl = {
    options: () =>
      versionModels().map((model) => ({
        id: modelKey(model),
        label: `${model.name} · ${
          model.provider.id === "swiftcoder"
            ? selectedProductMode() === "coding"
              ? "Included"
              : "PAYG"
            : "API key"
        }`,
      })),
    current: () => {
      const current = props.controls.model.selection.current()
      if (
        current &&
        versionModels().some((model) => modelKey(model) === modelKey(current)) &&
        (!apiServicesMode() || explicitModelSelection())
      )
        return modelKey(current)
      const fallback = versionModels()[0]
      return fallback ? modelKey(fallback) : ""
    },
    onSelect: (value) => selectModel(value, true),
  }
  const controller = createPromptInputV2Controller({
    store: () => prompt.capture().store,
    state: interaction,
    identity: () => prompt.capture(),
    history: {
      entries: (mode) =>
        history.entries(mode).map((value) => {
          const entry = normalizePromptHistoryEntry(value)
          return { prompt: entry.prompt, metadata: entry.comments }
        }),
      add: (value, mode) => history.add(value, mode, mode === "shell" ? [] : historyComments()),
      capture: historyComments,
      restore: (metadata) => restoreHistoryComments(metadata as PromptHistoryComment[]),
    },
    commands,
    context,
    searchContextFiles: async (query) =>
      (await files.searchFilesAndDirectories(query)).map((path) => ({
        id: `file:${path}`,
        kind: "file",
        label: path,
        path,
        mention: { type: "file", path, content: `@${path}`, start: 0, end: 0 },
      })),
    onContextRemove(item) {
      if (item?.commentID) comments.remove(item.path, item.commentID)
    },
    openAttachment: (attachment) =>
      dialog.show(() => <ImagePreview src={attachment.blob.url} alt={attachment.filename} />),
    openContext(key) {
      const item = controller.contextItem(key)
      if (item) openComment(item, props, sync, layout, files, comments)
    },
    onEditor(element) {
      editor = element as HTMLDivElement
      props.ref?.(editor)
    },
    onSuggestionSelect(item) {
      if (item.kind !== "command") return
      const selected = slashCommands().find((entry) => entry.id === item.id)
      if (!selected || selected.type === "custom") return
      return () => command.trigger(selected.id, "slash")
    },
    attachments: {
      picker: platform.openAttachmentPickerDialog,
      directory: () => sdk().directory,
      isDialogActive: () => !!dialog.active,
      warn: () =>
        showToast({
          title: language.t("prompt.toast.pasteUnsupported.title"),
          description: language.t("prompt.toast.pasteUnsupported.description"),
        }),
      duplicate: () => showToast({ title: language.t("prompt.toast.attachmentDuplicate.title") }),
      onError: (error) =>
        showToast({
          variant: "error",
          title: language.t("common.requestFailed"),
          description: error instanceof Error ? error.message : String(error),
        }),
      readClipboardImage: platform.readClipboardImage,
      getPathForFile: platform.getPathForFile,
      store: platform.draftStore?.putBlob,
    },
    view: {
      placeholder: designPlaceholder,
      get agent() {
        return props.controls.agents.visible && props.controls.agents.options.length > 0
          ? {
              options: () => props.controls.agents.options.map((name) => ({ id: name, label: name })),
              current: () => props.controls.agents.current,
              onSelect: (value: string) => props.controls.agents.select(value),
              keybind: () => command.keybindParts("agent.cycle"),
            }
          : undefined
      },
      variant: {
        options: () => variants().map((value) => ({ id: value, label: value })),
        current: () => props.controls.model.selection.variant.current() ?? "default",
        onSelect: (value) => props.controls.model.selection.variant.set(value === "default" ? undefined : value),
        keybind: () => command.keybindParts("model.variant.cycle"),
      },
      submit: {
        stopping,
        working,
        onSubmit: () => void submission.handleSubmit(new Event("submit")),
        onStop: () => void submission.abort(),
      },
    },
  })
  Object.defineProperties(controller, {
    sessionID: { get: () => props.controls.session.id },
    model: { get: () => props.controls.model },
    productMode: { get: () => productMode },
    modelFamily: { get: () => modelFamily },
    modelVersion: { get: () => modelVersion },
  })

  command.register("prompt-input", () => [
    {
      id: "file.attach",
      title: language.t("prompt.action.attachFile"),
      category: language.t("command.category.file"),
      keybind: "mod+u",
      disabled: controller.state.mode !== "normal",
      onSelect: () => controller.attach(),
    },
    {
      id: "prompt.mode.shell",
      title: language.t("command.prompt.mode.shell"),
      category: language.t("command.category.session"),
      keybind: "mod+shift+x",
      disabled: controller.state.mode === "shell",
      onSelect: () => controller.dispatch({ type: "mode.shell" }),
    },
    {
      id: "prompt.mode.normal",
      title: language.t("command.prompt.mode.normal"),
      category: language.t("command.category.session"),
      keybind: "mod+shift+e",
      disabled: controller.state.mode === "normal",
      onSelect: () => controller.dispatch({ type: "mode.normal" }),
    },
  ])

  createEffect(
    on(
      () => props.edit?.id,
      (id) => {
        const edit = props.edit
        if (!id || !edit) return
        prompt.context.items().forEach((item) => prompt.context.remove(item.key))
        edit.context.forEach((item) =>
          prompt.context.add({
            type: item.type,
            path: item.path,
            selection: item.selection,
            comment: item.comment,
            commentID: item.commentID,
            commentOrigin: item.commentOrigin,
            preview: item.preview,
          }),
        )
        controller.dispatch({ type: "mode.normal" })
        controller.resetHistory()
        prompt.set(edit.prompt, promptLength(edit.prompt))
        controller.restoreFocus()
        props.onEditLoaded?.()
      },
      { defer: true },
    ),
  )

  return controller as PromptInputV2ComposerController
}

function openComment(
  item: { path: string; commentID?: string; commentOrigin?: "review" | "file" },
  props: PromptInputV2ControllerProps,
  sync: ReturnType<typeof useSync>,
  layout: ReturnType<typeof useLayout>,
  files: ReturnType<typeof useFile>,
  comments: ReturnType<typeof useComments>,
) {
  if (!item.commentID) return
  const focus = { file: item.path, id: item.commentID }
  comments.setActive(focus)
  const queueFocus = (attempts = 6) => {
    requestAnimationFrame(() => {
      comments.setFocus({ ...focus })
      if (attempts <= 0) return
      requestAnimationFrame(() => {
        const current = comments.focus()
        if (current?.file === focus.file && current.id === focus.id) queueFocus(attempts - 1)
      })
    })
  }
  const diffs = props.controls.session.id ? sync().data.session_diff[props.controls.session.id] : undefined
  const review =
    item.commentOrigin === "review" || (item.commentOrigin !== "file" && diffs?.some((diff) => diff.file === item.path))
  if (!props.controls.session.reviewPanel.opened()) props.controls.session.reviewPanel.open()
  if (review) {
    layout.fileTree.setTab("changes")
    props.controls.session.tabs.setActive("review")
    queueFocus()
    return
  }
  layout.fileTree.setTab("all")
  const tab = files.tab(item.path)
  void props.controls.session.tabs.open(tab)
  props.controls.session.tabs.setActive(tab)
  void Promise.resolve(files.load(item.path)).finally(() => queueFocus())
}
