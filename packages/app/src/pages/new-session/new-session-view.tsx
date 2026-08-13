import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { Icon as IconV2 } from "@opencode-ai/ui/v2/icon"
import { TooltipV2 } from "@opencode-ai/ui/v2/tooltip-v2"
import { Show, createMemo, createSignal, type Accessor } from "solid-js"
import { createStore } from "solid-js/store"
import { Portal } from "solid-js/web"
import createPresence from "solid-presence"
import { PromptInputV2Composer } from "@/components/prompt-input-v2"
import {
  PromptProjectAddButton,
  PromptProjectSelector,
  type PromptProjectController,
} from "@/components/prompt-project-selector"
import { StatusPopoverV2 } from "@/components/status-popover"
import { useLanguage } from "@/context/language"
import { useSDK } from "@/context/sdk"
import { useServerSync } from "@/context/server-sync"
import { useProviders } from "@/hooks/use-providers"
import { Persist, persisted } from "@/utils/persist"
import type { NewSessionDraftController } from "./new-session-draft-controller"
import type { NewSessionWorkspaceController } from "./new-session-workspace-controller"
import { getFilename } from "@opencode-ai/core/util/path"

const providerTipDismissalDuration = 30 * 24 * 60 * 60 * 1000

export function NewSessionView(props: {
  input: NewSessionDraftController["input"]
  project: PromptProjectController
  workspace: NewSessionWorkspaceController
}) {
  const selectedProject = createMemo(() => props.project.selected())
  const projectName = createMemo(() => {
    const project = selectedProject()
    if (project?.name) return project.name
    const root = project?.worktree || props.workspace.project.root()
    return getFilename(root) || "Current project"
  })
  const projectPath = createMemo(() => selectedProject()?.worktree || props.workspace.project.root())
  const branch = createMemo(() => props.workspace.bar.branch())

  return (
    <div class="@container relative h-full min-h-0 flex-1 overflow-hidden bg-background-base">
      <div data-component="session-new-design" class="grid size-full min-w-0 grid-cols-[minmax(0,1fr)_248px]">
        <section class="flex min-h-0 min-w-0 flex-col bg-background-base">
          <div class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 pb-20">
            <div class="flex max-w-[520px] flex-col items-center text-center">
              <div class="mb-5">
                <PromptProjectSelector controller={props.project} placement="bottom" iconOnly />
              </div>
              <h1 class="text-16-medium text-text-strong">What are you working on?</h1>
              <p class="mt-2 text-13-regular text-text-base">
                SwiftCoder can inspect your project, edit files, run commands, and review changes.
              </p>
            </div>
          </div>

          <div
            data-component="session-new-composer"
            class="shrink-0 border-t border-border-weaker-base bg-background-base px-5 pb-4 pt-3"
          >
            <div class="mx-auto w-full max-w-[760px]">
              <PromptInputV2Composer controller={props.input} />
              <Show when={props.project.empty()}>
                <div class="mt-2 flex min-h-7 min-w-0 items-center justify-center text-v2-text-text-faint">
                  <PromptProjectAddButton controller={props.project} />
                </div>
              </Show>
            </div>
          </div>
        </section>

        <aside
          data-component="session-new-context"
          class="flex min-h-0 flex-col border-l border-border-weaker-base bg-background-stronger"
        >
          <div class="flex h-12 shrink-0 items-center border-b border-border-weaker-base px-4 text-13-medium text-text-strong">
            Context
          </div>
          <div class="flex flex-col gap-5 overflow-y-auto px-4 py-4">
            <section>
              <div class="mb-2 text-12-regular text-text-weak">Workspace</div>
              <div class="flex items-center gap-2 text-13-regular text-text-base">
                <IconV2 name="folder" size="small" class="shrink-0" />
                <span class="truncate" title={projectPath()}>
                  {projectName()}
                </span>
              </div>
              <div class="mt-2 flex items-center gap-2 text-12-regular text-text-weak">
                <IconV2 name="branch" size="small" class="shrink-0" />
                <span class="truncate">{branch() || "No Git repository"}</span>
              </div>
            </section>
            <div class="border-t border-border-weaker-base" />
            <section>
              <div class="mb-2 text-12-regular text-text-weak">Changes</div>
              <div class="text-13-regular text-text-base">No changes in this session</div>
            </section>
            <div class="border-t border-border-weaker-base" />
            <section>
              <div class="mb-2 text-12-regular text-text-weak">Tasks</div>
              <div class="flex items-center gap-2 text-13-regular text-text-base">
                <IconV2 name="terminal" size="small" class="shrink-0" />
                <span>Ready for your request</span>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}

export function NewSessionStatus(props: { mount: Accessor<HTMLElement | null>; visible: Accessor<boolean> }) {
  const language = useLanguage()

  return (
    <Show when={props.mount()} keyed>
      {(mount) => (
        <Portal mount={mount}>
          <Show when={props.visible()}>
            <Tooltip placement="bottom" value={language.t("status.popover.trigger")}>
              <StatusPopoverV2 />
            </Tooltip>
          </Show>
        </Portal>
      )}
    </Show>
  )
}

function ProviderTip() {
  const language = useLanguage()
  const dialog = useDialog()
  const sdk = useSDK()
  const serverSync = useServerSync()
  const providers = useProviders(() => sdk().directory)
  const [persistedState, setPersistedState, , persistedReady] = persisted(
    Persist.global("new-session.provider-tip"),
    createStore({ dismissedAt: 0 }),
  )
  const visible = createMemo(
    () =>
      serverSync().child(sdk().directory)[0].provider_ready &&
      persistedReady() &&
      providers.paid().length === 0 &&
      Date.now() - persistedState.dismissedAt >= providerTipDismissalDuration,
  )
  const [ref, setRef] = createSignal<HTMLDivElement>()
  const presence = createPresence({
    show: visible,
    element: () => ref() ?? null,
  })
  const openProviders = () => {
    void import("@/components/dialog-connect-provider").then(({ DialogConnectProvider }) => {
      void dialog.show(() => <DialogConnectProvider directory={() => sdk().directory} />)
    })
  }

  return (
    <Show when={presence.present()}>
      <div class="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-10">
        <div
          ref={setRef}
          data-component="provider-tip"
          data-visible={visible()}
          class="group/provider-tip pointer-events-auto relative flex h-6 max-w-full items-center transition-[opacity,transform] duration-[250ms] ease-[cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none"
          classList={{ "data-[visible=false]:animate-out fade-out slide-out-to-bottom-4": true }}
        >
          <button
            type="button"
            class="flex h-6 min-w-0 items-center rounded-[4px] pl-1.5 text-[13px] leading-none tracking-[-0.04px] text-v2-text-text-faint transition-[background-color,color] duration-150 ease-in-out hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-muted focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:text-v2-text-text-muted focus-visible:outline-none"
            onClick={openProviders}
          >
            <span class="truncate">{language.t("home.providerTip")}</span>
            <span class="flex size-6 shrink-0 items-center justify-center" aria-hidden="true">
              <IconV2 name="chevron-down" size="small" class="-rotate-90" />
            </span>
          </button>
          <TooltipV2
            class="hover-reveal absolute left-full top-0 flex h-6 w-7 items-center justify-end delay-0 duration-0 group-hover/provider-tip:delay-[250ms] group-hover/provider-tip:duration-150 group-hover/provider-tip:opacity-100 focus-within:delay-0 focus-within:duration-0 focus-within:opacity-100"
            placement="top"
            openDelay={1000}
            value={language.t("common.dismiss")}
          >
            <button
              type="button"
              class="flex size-6 items-center justify-center rounded-[4px] text-v2-icon-icon-muted transition-[background-color,color] duration-150 ease-in-out hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-icon-icon-base focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:text-v2-icon-icon-base focus-visible:outline-none"
              aria-label={language.t("common.dismiss")}
              onClick={() => setPersistedState("dismissedAt", Date.now())}
            >
              <IconV2 name="xmark-small" />
            </button>
          </TooltipV2>
        </div>
      </div>
    </Show>
  )
}
