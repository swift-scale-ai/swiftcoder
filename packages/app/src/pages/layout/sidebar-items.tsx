import type { Session } from "@swiftscale/sdk/v2/client"
import { Avatar } from "@swiftscale/ui/avatar"
import { Icon as IconV2 } from "@swiftscale/ui/v2/icon"
import { IconButton } from "@swiftscale/ui/icon-button"
import { InlineInput } from "@swiftscale/ui/inline-input"
import { DropdownMenu } from "@swiftscale/ui/dropdown-menu"
import { Spinner } from "@swiftscale/ui/spinner"
import { Tooltip } from "@swiftscale/ui/tooltip"
import { getFilename } from "@swiftscale/core/util/path"
import { A, useParams } from "@solidjs/router"
import { type Accessor, createMemo, createSignal, For, type JSX, Match, Show, Switch } from "solid-js"
import { useServerSync } from "@/context/server-sync"
import { useServerSDK } from "@/context/server-sdk"
import { useLanguage } from "@/context/language"
import { getAvatarColors, type LocalProject, useLayout } from "@/context/layout"
import { useNotification } from "@/context/notification"
import { usePermission } from "@/context/permission"
import { messageAgentColor } from "@/utils/agent"
import { sessionTitle } from "@/utils/session-title"
import { showToast } from "@/utils/toast"
import { sessionPermissionRequest } from "../session/composer/session-request-tree"
import {
  childSessionOnPath,
  errorMessage,
  formatRecentSessionTime,
  getProjectAvatarSource,
  hasProjectPermissions,
} from "./helpers"

export const ProjectIcon = (props: {
  project: LocalProject
  class?: string
  notify?: boolean
  working?: boolean
}): JSX.Element => {
  const serverSync = useServerSync()
  const notification = useNotification()
  const permission = usePermission()
  const dirs = createMemo(() => [props.project.worktree, ...(props.project.sandboxes ?? [])])
  const unseenCount = createMemo(() =>
    dirs().reduce((total, directory) => total + notification.project.unseenCount(directory), 0),
  )
  const hasError = createMemo(() => dirs().some((directory) => notification.project.unseenHasError(directory)))
  const hasPermissions = createMemo(() =>
    dirs().some((directory) => {
      return hasProjectPermissions(serverSync().session.data.permission, (item) => {
        if (serverSync().session.get(item.sessionID)?.directory !== directory) return false
        return !permission.autoResponds(item, directory)
      })
    }),
  )
  const notify = createMemo(() => props.notify && (hasPermissions() || unseenCount() > 0))
  const name = createMemo(() => props.project.name || getFilename(props.project.worktree))

  return (
    <div class={`relative size-8 shrink-0 rounded ${props.class ?? ""}`}>
      <div class="size-full rounded overflow-clip">
        <Avatar
          fallback={name()}
          src={getProjectAvatarSource(props.project.id, props.project.icon)}
          {...getAvatarColors(props.project.icon?.color)}
          class="size-full rounded"
          classList={{ "badge-mask": notify() }}
        />
      </div>
      <Show when={notify()}>
        <div
          classList={{
            "absolute top-px right-px size-1.5 rounded-full z-10": true,
            "bg-surface-warning-strong": hasPermissions(),
            "bg-icon-critical-base": !hasPermissions() && hasError(),
            "bg-text-interactive-base": !hasPermissions() && !hasError(),
          }}
        />
      </Show>
      <Show when={props.working}>
        <div class="absolute bottom-px right-px size-3 rounded-full bg-background-base z-10 flex items-center justify-center">
          <Spinner class="size-[9px]" />
        </div>
      </Show>
    </div>
  )
}

export type SessionItemProps = {
  session: Session
  list: Session[]
  chat?: boolean
  navList?: Accessor<Session[]>
  slug: string
  mobile?: boolean
  dense?: boolean
  showMeta?: boolean
  showTooltip?: boolean
  showChild?: boolean
  displayTitle?: Accessor<string | undefined>
  level?: number
  sidebarExpanded: Accessor<boolean>
  clearHoverProjectSoon: () => void
  prefetchSession: (session: Session, priority?: "high" | "low") => void
  archiveSession: (session: Session) => Promise<void>
}

const SessionRow = (props: {
  session: Session
  chat?: boolean
  displayTitle?: Accessor<string | undefined>
  slug: string
  mobile?: boolean
  dense?: boolean
  tint: Accessor<string | undefined>
  isWorking: Accessor<boolean>
  hasPermissions: Accessor<boolean>
  hasError: Accessor<boolean>
  unseenCount: Accessor<number>
  meta?: Accessor<string>
  metaActive?: Accessor<boolean>
  clearHoverProjectSoon: () => void
  sidebarOpened: Accessor<boolean>
  warmPress: () => void
  warmFocus: () => void
  renaming: Accessor<boolean>
  renameValue: Accessor<string>
  setRenameValue: (value: string) => void
  startRename: () => void
  saveRename: () => void
  cancelRename: () => void
}): JSX.Element => {
  const language = useLanguage()
  const title = () => props.displayTitle?.() || sessionTitle(props.session.title)

  return (
    <div
      data-component="sidebar-session-row"
      class={`flex items-center gap-2 min-w-0 w-full text-left ${props.dense ? "py-0.5" : "py-1"}`}
      onPointerDown={props.warmPress}
    >
      <Show when={props.isWorking() || props.hasPermissions() || props.hasError() || props.unseenCount() > 0}>
        <div
          class="shrink-0 size-6 flex items-center justify-center"
          style={{ color: props.tint() ?? "var(--icon-interactive-base)" }}
        >
          <Switch>
            <Match when={props.isWorking()}>
              <Spinner class="size-[15px]" />
            </Match>
            <Match when={props.hasPermissions()}>
              <div class="size-1.5 rounded-full bg-surface-warning-strong" />
            </Match>
            <Match when={props.hasError()}>
              <div class="size-1.5 rounded-full bg-text-diff-delete-base" />
            </Match>
            <Match when={props.unseenCount() > 0}>
              <div class="size-1.5 rounded-full bg-text-interactive-base" />
            </Match>
          </Switch>
        </div>
      </Show>
      <Show
        when={props.renaming()}
        fallback={
          <A
            href={`/${props.slug}/session/${props.session.id}${props.chat ? "?view=chat" : ""}`}
            class="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none"
            onFocus={props.warmFocus}
            onClick={() => {
              if (props.sidebarOpened()) return
              props.clearHoverProjectSoon()
            }}
            onDblClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              props.startRename()
            }}
          >
            <span class="text-14-regular text-text-strong min-w-0 flex-1 truncate">{title()}</span>
            <Show when={props.meta}>
              {(meta) => (
                <span
                  class="shrink-0 text-11-regular group-hover/session:hidden"
                  classList={{
                    "text-text-interactive-base": props.metaActive?.(),
                    "text-text-weak": !props.metaActive?.(),
                  }}
                >
                  {meta()()}
                </span>
              )}
            </Show>
          </A>
        }
      >
        <InlineInput
          ref={(element) => requestAnimationFrame(() => element.select())}
          value={props.renameValue()}
          class="h-6 min-w-0 flex-1 text-14-regular"
          aria-label={language.t("common.rename")}
          onInput={(event) => props.setRenameValue(event.currentTarget.value)}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === "Enter") {
              event.preventDefault()
              props.saveRename()
            }
            if (event.key === "Escape") {
              event.preventDefault()
              props.cancelRename()
            }
          }}
          onBlur={props.saveRename}
          onPointerDown={(event) => event.stopPropagation()}
        />
      </Show>
    </div>
  )
}

export const SessionItem = (props: SessionItemProps): JSX.Element => {
  const params = useParams()
  const layout = useLayout()
  const language = useLanguage()
  const notification = useNotification()
  const permission = usePermission()
  const sdk = useServerSDK()
  const serverSync = useServerSync()
  const [renaming, setRenaming] = createSignal(false)
  const [renameValue, setRenameValue] = createSignal("")
  const unseenCount = createMemo(() => notification.session.unseenCount(props.session.id))
  const hasError = createMemo(() => notification.session.unseenHasError(props.session.id))
  const [sessionStore] = serverSync().child(props.session.directory)
  const hasPermissions = createMemo(() => {
    return !!sessionPermissionRequest(
      sessionStore.session,
      serverSync().session.data.permission,
      props.session.id,
      (item) => {
        return !permission.autoResponds(item, props.session.directory)
      },
    )
  })
  const isWorking = createMemo(() => {
    if (hasPermissions()) return false
    return serverSync().session.data.session_working(props.session.id)
  })
  const meta = createMemo(() => {
    if (isWorking()) return "Running"
    return formatRecentSessionTime(props.session.time.updated ?? props.session.time.created)
  })

  const tint = createMemo(() =>
    messageAgentColor(serverSync().session.data.message[props.session.id], sessionStore.agent),
  )
  const tooltip = createMemo(() => props.showTooltip ?? (props.mobile || !props.sidebarExpanded()))
  const currentChild = createMemo(() => {
    if (!props.showChild) return
    return childSessionOnPath(sessionStore.session, props.session.id, params.id)
  })

  const startRename = () => {
    setRenameValue(sessionTitle(props.session.title) ?? "")
    setRenaming(true)
  }
  const cancelRename = () => setRenaming(false)
  const applyTitle = (title: string) => {
    serverSync().session.remember({ ...props.session, title })
    const [, setStore] = serverSync().child(props.session.directory)
    setStore("session", (list: Session[]) =>
      list.map((session) => (session.id === props.session.id ? { ...session, title } : session)),
    )
  }
  const saveRename = () => {
    if (!renaming()) return
    const title = renameValue().trim()
    setRenaming(false)
    if (!title || title === sessionTitle(props.session.title)) return
    const previous = props.session.title
    applyTitle(title)
    void sdk()
      .api.session.rename({ sessionID: props.session.id, title })
      .catch((cause) => {
        applyTitle(previous)
        showToast({
          title: language.t("common.requestFailed"),
          description: errorMessage(cause, language.t("common.requestFailed")),
        })
      })
  }

  const warm = (span: number, priority: "high" | "low") => {
    const nav = props.navList?.()
    const list = nav?.some((item) => item.id === props.session.id && item.directory === props.session.directory)
      ? nav
      : props.list

    props.prefetchSession(props.session, priority)

    const idx = list.findIndex((item) => item.id === props.session.id && item.directory === props.session.directory)
    if (idx === -1) return

    for (let step = 1; step <= span; step++) {
      const next = list[idx + step]
      if (next) props.prefetchSession(next, step === 1 ? "high" : priority)

      const prev = list[idx - step]
      if (prev) props.prefetchSession(prev, step === 1 ? "high" : priority)
    }
  }

  const item = (
    <SessionRow
      session={props.session}
      chat={props.chat}
      displayTitle={props.displayTitle}
      slug={props.slug}
      mobile={props.mobile}
      dense={props.dense}
      tint={tint}
      isWorking={isWorking}
      hasPermissions={hasPermissions}
      hasError={hasError}
      unseenCount={unseenCount}
      meta={props.showMeta ? meta : undefined}
      metaActive={isWorking}
      clearHoverProjectSoon={props.clearHoverProjectSoon}
      sidebarOpened={layout.sidebar.opened}
      warmPress={() => warm(2, "high")}
      warmFocus={() => warm(2, "high")}
      renaming={renaming}
      renameValue={renameValue}
      setRenameValue={setRenameValue}
      startRename={startRename}
      saveRename={saveRename}
      cancelRename={cancelRename}
    />
  )

  return (
    <>
      <div
        data-session-id={props.session.id}
        class="group/session relative w-full min-w-0 rounded-md cursor-default pr-3 transition-colors hover:bg-surface-raised-base-hover [&:has(:focus-visible)]:bg-surface-raised-base-hover has-[[data-expanded]]:bg-surface-raised-base-hover has-[.active]:bg-surface-base-active"
        style={{ "padding-left": `${8 + (props.level ?? 0) * 16}px` }}
      >
        <div class="flex min-w-0 items-center gap-1">
          <div class="min-w-0 flex-1">
            <Show
              when={!tooltip()}
              fallback={
                <Tooltip
                  placement={props.mobile ? "bottom" : "right"}
                  value={sessionTitle(props.session.title)}
                  gutter={10}
                  class="min-w-0 w-full"
                >
                  {item}
                </Tooltip>
              }
            >
              {item}
            </Show>
          </div>

          <Show when={!props.level}>
            <div
              class="shrink-0 overflow-hidden transition-[width,opacity]"
              classList={{
                "w-6 opacity-100 pointer-events-auto": !!props.mobile,
                "w-0 opacity-0 pointer-events-none": !props.mobile,
                "group-hover/session:w-6 group-hover/session:opacity-100 group-hover/session:pointer-events-auto": true,
                "group-focus-within/session:w-6 group-focus-within/session:opacity-100 group-focus-within/session:pointer-events-auto": true,
              }}
            >
              <DropdownMenu>
                <Tooltip value={language.t("common.moreOptions")} placement="top">
                  <DropdownMenu.Trigger
                    as={IconButton}
                    icon="dot-grid"
                    variant="ghost"
                    class="size-6 rounded-md"
                    aria-label={language.t("common.moreOptions")}
                  />
                </Tooltip>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content>
                    <DropdownMenu.Item onSelect={() => requestAnimationFrame(startRename)}>
                      <DropdownMenu.ItemLabel>{language.t("common.rename")}</DropdownMenu.ItemLabel>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => void props.archiveSession(props.session)}>
                      <DropdownMenu.ItemLabel>{language.t("common.archive")}</DropdownMenu.ItemLabel>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu>
            </div>
          </Show>
        </div>
      </div>
      <Show when={currentChild()} keyed>
        {(child) => (
          <div class="w-full">
            <SessionItem {...props} session={child} showChild={false} level={(props.level ?? 0) + 1} />
          </div>
        )}
      </Show>
    </>
  )
}

export const NewSessionItem = (props: {
  slug: string
  mobile?: boolean
  dense?: boolean
  sidebarExpanded: Accessor<boolean>
  clearHoverProjectSoon: () => void
}): JSX.Element => {
  const layout = useLayout()
  const language = useLanguage()
  const label = language.t("command.session.new")
  const tooltip = () => props.mobile || !props.sidebarExpanded()
  const item = (
    <A
      href={`/${props.slug}/session`}
      end
      class={`flex items-center gap-2 min-w-0 w-full text-left focus:outline-none ${props.dense ? "py-0.5" : "py-1"}`}
      onClick={() => {
        if (layout.sidebar.opened()) return
        props.clearHoverProjectSoon()
      }}
    >
      <div class="shrink-0 size-6 flex items-center justify-center">
        <IconV2 name="edit" size="small" class="text-icon-weak" />
      </div>
      <span class="text-14-regular text-text-strong min-w-0 flex-1 truncate">{label}</span>
    </A>
  )

  return (
    <div class="group/session relative w-full min-w-0 rounded-md cursor-default transition-colors pl-2 pr-3 hover:bg-surface-raised-base-hover [&:has(:focus-visible)]:bg-surface-raised-base-hover has-[.active]:bg-surface-base-active">
      <Show
        when={!tooltip()}
        fallback={
          <Tooltip placement={props.mobile ? "bottom" : "right"} value={label} gutter={10} class="min-w-0 w-full">
            {item}
          </Tooltip>
        }
      >
        {item}
      </Show>
    </div>
  )
}

export const SessionSkeleton = (props: { count?: number }): JSX.Element => {
  const items = Array.from({ length: props.count ?? 4 }, (_, index) => index)
  return (
    <div class="flex flex-col gap-1">
      <For each={items}>
        {() => <div class="h-8 w-full rounded-md bg-surface-raised-base opacity-60 animate-pulse" />}
      </For>
    </div>
  )
}
