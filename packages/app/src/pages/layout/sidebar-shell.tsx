import { For, Show, createMemo, createSignal, onCleanup, onMount, type Accessor, type JSX } from "solid-js"
import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  closestCenter,
  type DragEvent,
} from "@thisbeyond/solid-dnd"
import { ConstrainDragXAxis } from "@/utils/solid-dnd"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Button } from "@opencode-ai/ui/button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { type LocalProject } from "@/context/layout"
import { usePlatform, type SwiftScaleAuthStatus, type SwiftScaleEntitlements } from "@/context/platform"
import { accountSummary } from "./account-summary"
import { swiftScaleAccountDisplayName } from "@/components/swiftscale-account-presentation"

export const SidebarContent = (props: {
  mobile?: boolean
  opened: Accessor<boolean>
  aimMove: (event: MouseEvent) => void
  projects: Accessor<LocalProject[]>
  recents: Accessor<JSX.Element[]>
  projectsLabel: string
  chatLabel: string
  noProjectsLabel: string
  noChatsLabel: string
  loadMoreChatsLabel: string
  hasMoreChats: Accessor<boolean>
  onLoadMoreChats: () => void
  renderProject: (project: LocalProject) => JSX.Element
  handleDragStart: (event: unknown) => void
  handleDragEnd: () => void
  handleDragOver: (event: DragEvent) => void
  newChatLabel: string
  newChatKeybind: Accessor<string | undefined>
  onNewTask: () => void
  onNewChat: () => void
  openProjectLabel: JSX.Element
  openProjectKeybind: Accessor<string | undefined>
  onOpenProject: () => void
  renderProjectOverlay: () => JSX.Element
  helpLabel: Accessor<string>
  onOpenHelp: () => void
  onOpenAccount: () => void
}): JSX.Element => {
  const expanded = () => !!props.mobile || props.opened()
  const placement = () => (props.mobile ? "bottom" : "right")
  const platform = usePlatform()
  const [accountStatus, setAccountStatus] = createSignal<SwiftScaleAuthStatus>({ state: "signed_out" })
  const [entitlements, setEntitlements] = createSignal<SwiftScaleEntitlements>()
  const summary = createMemo(() => accountSummary(accountStatus(), entitlements()))
  const account = createMemo(() => {
    const status = accountStatus()
    return status.state === "signed_in" ? status.account : undefined
  })
  const accountLabel = createMemo(() => {
    const current = account()
    return current ? swiftScaleAccountDisplayName(current) : summary().label
  })
  const accountInitials = createMemo(() => {
    const label = accountLabel().trim()
    if (!label) return "S"
    const words = label.split(/\s+/).filter(Boolean)
    return `${words[0]?.[0] ?? ""}${words.length > 1 ? (words.at(-1)?.[0] ?? "") : ""}`.toUpperCase()
  })
  const summaryTone = createMemo(() => {
    if (summary().tone === "available") return "bg-surface-success-strong"
    if (summary().tone === "warning") return "bg-surface-warning-strong"
    if (summary().tone === "critical") return "bg-surface-critical-strong"
    return "bg-surface-neutral-strong"
  })
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
  return (
    <div
      data-component="sidebar-rail"
      class="flex h-full w-full min-w-0 flex-col overflow-hidden border-e border-border-weaker-base bg-[#f7f7f7]"
      onMouseMove={props.aimMove}
    >
      <div class="shrink-0 px-3 pb-2 pt-3">
        <button
          type="button"
          class="flex h-9 w-full cursor-default items-center gap-2 rounded-md border border-border-weak-base bg-background-base px-2 text-left text-13-medium text-text-strong hover:bg-surface-base-hover"
          onClick={props.onNewTask}
          aria-label={props.newChatLabel}
        >
          <Icon name="plus" size="small" class="shrink-0" />
          <Show when={expanded()}>
            <span class="min-w-0 flex-1 truncate">{props.newChatLabel}</span>
            <Show when={props.newChatKeybind()}>
              <span class="shrink-0 text-11-regular text-text-weak">{props.newChatKeybind()}</span>
            </Show>
          </Show>
        </button>
      </div>

      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3 no-scrollbar">
        <Show when={expanded()}>
          <div class="mt-2 flex h-8 shrink-0 items-center justify-between px-2 text-11-medium uppercase text-text-weak">
            <span>{props.projectsLabel}</span>
            <Tooltip placement="bottom" value={props.openProjectLabel}>
              <IconButton
                icon="folder-add-left"
                variant="ghost"
                size="small"
                onClick={props.onOpenProject}
                aria-label={typeof props.openProjectLabel === "string" ? props.openProjectLabel : undefined}
              />
            </Tooltip>
          </div>
        </Show>
        <DragDropProvider
          onDragStart={props.handleDragStart}
          onDragEnd={props.handleDragEnd}
          onDragOver={props.handleDragOver}
          collisionDetector={closestCenter}
        >
          <DragDropSensors />
          <ConstrainDragXAxis />
          <div class="shrink-0">
            <SortableProvider ids={props.projects().map((project) => project.worktree)}>
              <For each={props.projects()}>{(project) => props.renderProject(project)}</For>
            </SortableProvider>
            <Show when={expanded() && props.projects().length === 0}>
              <div class="px-2 py-2 text-12-regular text-text-weak">{props.noProjectsLabel}</div>
            </Show>
            <Show when={!expanded()}>
              <Tooltip
                placement={placement()}
                value={
                  <div class="flex items-center gap-2">
                    <span>{props.openProjectLabel}</span>
                    <Show when={!props.mobile && !!props.openProjectKeybind()}>
                      <span class="text-icon-base text-12-medium">{props.openProjectKeybind()}</span>
                    </Show>
                  </div>
                }
              >
                <IconButton
                  icon="plus"
                  variant="ghost"
                  size="large"
                  class="mx-auto mt-2"
                  onClick={props.onOpenProject}
                  aria-label={typeof props.openProjectLabel === "string" ? props.openProjectLabel : undefined}
                />
              </Tooltip>
            </Show>
          </div>
          <DragOverlay>{props.renderProjectOverlay()}</DragOverlay>
        </DragDropProvider>

        <Show when={expanded()}>
          <div class="mt-4 shrink-0">
            <div class="flex h-8 items-center justify-between px-2 text-11-medium uppercase text-text-weak">
              <span>{props.chatLabel}</span>
              <Tooltip placement="bottom" value={props.newChatLabel}>
                <IconButton
                  icon="plus"
                  variant="ghost"
                  size="small"
                  data-action="chat-new-session"
                  onClick={props.onNewChat}
                  aria-label={props.newChatLabel}
                />
              </Tooltip>
            </div>
            <div>
              <Show
                when={props.recents().length > 0}
                fallback={<div class="px-2 py-1 text-12-regular text-text-weak">{props.noChatsLabel}</div>}
              >
                <For each={props.recents()}>{(item) => item}</For>
                <Show when={props.hasMoreChats()}>
                  <Button
                    variant="ghost"
                    size="large"
                    class="flex w-full justify-start px-2 text-left text-14-regular text-text-weak"
                    onClick={props.onLoadMoreChats}
                  >
                    {props.loadMoreChatsLabel}
                  </Button>
                </Show>
              </Show>
            </div>
          </div>
        </Show>
      </div>

      <div class="shrink-0 border-t border-border-weaker-base px-2 py-2">
        <Show
          when={expanded()}
          fallback={
            <div class="flex flex-col items-center gap-1">
              <IconButton
                icon="shield"
                variant="ghost"
                size="large"
                onClick={props.onOpenAccount}
                aria-label={accountLabel()}
              />
              <IconButton
                icon="help"
                variant="ghost"
                size="large"
                onClick={props.onOpenHelp}
                aria-label={props.helpLabel()}
              />
            </div>
          }
        >
          <div
            class="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-13-regular text-text-base hover:bg-surface-base-hover"
            aria-label={[summary().label, summary().detail].filter(Boolean).join(", ")}
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={props.onOpenAccount}
            >
              <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-text-interactive-base text-9-medium text-white">
                {accountInitials()}
              </span>
              <span class="min-w-0 flex-1 truncate">{accountLabel()}</span>
            </button>
            <Show when={accountStatus().state === "signed_in"}>
              <span class={`size-1.5 shrink-0 rounded-full ${summaryTone()}`} aria-hidden="true" />
            </Show>
            <IconButton
              icon="help"
              variant="ghost"
              size="small"
              onClick={props.onOpenHelp}
              aria-label={props.helpLabel()}
            />
          </div>
        </Show>
      </div>
    </div>
  )
}
