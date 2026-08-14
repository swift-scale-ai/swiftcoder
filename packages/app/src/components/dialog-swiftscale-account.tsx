import { usePlatform, type SwiftScaleAuthStatus, type SwiftScaleEntitlements } from "@/context/platform"
import { Button } from "@swiftscale/ui/button"
import { Dialog } from "@swiftscale/ui/dialog"
import { Show, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { swiftScaleAccountDisplayName, swiftScaleAccountPresentation } from "./swiftscale-account-presentation"
import { SettingsList } from "./settings-list"
import { SettingsRow } from "./settings-general"
import { useLanguage } from "@/context/language"

const accountProduct = (status: SwiftScaleAuthStatus, entitlements?: SwiftScaleEntitlements) => {
  if (status.state !== "signed_in") return ""
  if (entitlements?.products?.coding.enabled && entitlements.products.apiServices.enabled) {
    return "Coding + API Services"
  }
  return status.account.plan === "coding" ? "Coding" : "API Services"
}

const titleCase = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1).replaceAll("_", " ")

const usageTone = (level: SwiftScaleEntitlements["usage"]["level"]) => {
  if (level === "available") return "bg-surface-success-strong"
  if (level === "limited") return "bg-surface-warning-strong"
  return "bg-surface-critical-strong"
}

export function SwiftScaleAccountSettings(props: { refreshEntitlements?: boolean } = {}) {
  const platform = usePlatform()
  const language = useLanguage()
  const auth = platform.swiftScaleAuth
  const [status, setStatus] = createSignal<SwiftScaleAuthStatus>({ state: "signed_out" })
  const [entitlements, setEntitlements] = createSignal<SwiftScaleEntitlements>()
  const [busy, setBusy] = createSignal(false)
  const [entitlementsBusy, setEntitlementsBusy] = createSignal(false)
  const [entitlementsError, setEntitlementsError] = createSignal<string>()
  let refreshPending = props.refreshEntitlements !== false
  const account = createMemo(() => {
    const value = status()
    return value.state === "signed_in" ? value.account : undefined
  })
  const errorMessage = createMemo(() => {
    const value = status()
    return value.state === "error" ? value.message : undefined
  })
  const presentation = createMemo(() => {
    const value = entitlements()
    return value ? swiftScaleAccountPresentation(value) : undefined
  })

  const loadEntitlements = async (refresh = false) => {
    if (!auth || entitlementsBusy()) return
    setEntitlementsBusy(true)
    setEntitlementsError(undefined)
    try {
      setEntitlements(await auth.entitlements(refresh))
      if (refresh) setStatus(await auth.status())
    } catch (error) {
      setEntitlementsError(error instanceof Error ? error.message : language.t("settings.account.error.planDetails"))
    } finally {
      setEntitlementsBusy(false)
    }
  }

  const updateStatus = (value: SwiftScaleAuthStatus) => {
    setStatus(value)
    if (value.state === "signed_in") {
      const refresh = refreshPending
      refreshPending = false
      void loadEntitlements(refresh)
      return
    }
    setEntitlements(undefined)
  }

  onMount(() => {
    if (!auth) return
    void auth.status().then(updateStatus)
    const unsubscribe = auth.subscribe(updateStatus)
    onCleanup(unsubscribe)
  })

  const run = async (action: "login" | "logout") => {
    if (!auth || busy()) return
    setBusy(true)
    try {
      updateStatus(await auth[action]())
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : language.t("settings.account.error.authentication"),
      })
    } finally {
      setBusy(false)
    }
  }

  const resetLabel = () => {
    const value = entitlements()?.usage.resetsAt
    if (!value) return language.t("settings.account.reset.none")
    const date = new Date(value)
    if (Number.isNaN(date.valueOf())) return language.t("settings.account.reset.unavailable")
    return language.t("settings.account.reset.at", { date: date.toLocaleString(language.intl()) })
  }

  const usageLabel = (level: SwiftScaleEntitlements["usage"]["level"]) =>
    level === "available"
      ? language.t("settings.account.usage.available")
      : level === "limited"
        ? language.t("settings.account.usage.limited")
        : language.t("settings.account.usage.exhausted")

  const contextLabel = (tier: string) =>
    tier === "standard"
      ? language.t("settings.account.context.standard")
      : tier === "extended"
        ? language.t("settings.account.context.extended")
        : tier === "maximum"
          ? language.t("settings.account.context.maximum")
          : titleCase(tier)

  const apiServiceConcurrency = (plan: SwiftScaleEntitlements) => {
    const product = plan.products?.apiServices
    if (product?.concurrencyLimit !== undefined) return product.concurrencyLimit
    if (product?.accountTier === "team") return 20
    if (product?.accountTier === "business") return 80
    if (product?.accountTier === "enterprise") return 0
    return 3
  }

  const concurrencyLabel = (count: number) =>
    count === 0
      ? language.t("settings.account.capacity.unlimited")
      : language.t("settings.account.capacity.tasks", { count })

  const subscriptionLabel = (status: SwiftScaleEntitlements["subscription"]) =>
    status === "active"
      ? language.t("settings.account.subscription.active")
      : status === "past_due"
        ? language.t("settings.account.subscription.pastDue")
        : language.t("settings.account.subscription.canceled")

  const serviceLabel = (status: SwiftScaleEntitlements["service"]["status"]) =>
    status === "operational"
      ? language.t("settings.account.service.operational")
      : status === "degraded"
        ? language.t("settings.account.service.degraded")
        : language.t("settings.account.service.unavailable")

  const presentationSubtitle = (plan: SwiftScaleEntitlements) => {
    const value = presentation()
    if (value?.apiOnly) {
      const accountTier = plan.products?.apiServices.accountTier
      return accountTier
        ? language.t("settings.account.plan.accountPayg", { tier: titleCase(accountTier) })
        : language.t("settings.account.billing.payg")
    }
    const subscription = plan.products?.coding.subscription ?? plan.subscription
    const base = language.t("settings.account.plan.subscription", { status: subscriptionLabel(subscription) })
    return value?.apiServices ? language.t("settings.account.plan.subscriptionWithApi", { subscription: base }) : base
  }

  const openBilling = () => {
    void platform.recordProductMetric?.("billing.opened")
    const plan = entitlements()
    const apiOnly = plan ? swiftScaleAccountPresentation(plan).apiOnly : false
    platform.openExternal(
      apiOnly
        ? "https://swift-scale.com/console/?service=api_services&view=billing"
        : entitlements()?.tier === "free"
          ? "https://swift-scale.com/coding-plan/"
          : "https://swift-scale.com/console/?service=coding_plan&view=billing",
    )
  }

  const openSupport = () => {
    void platform.recordProductMetric?.("support.opened")
    const url = new URL("https://swift-scale.com/contact/")
    const requestID = entitlements()?.requestID
    if (requestID) url.searchParams.set("request_id", requestID)
    platform.openExternal(url.toString())
  }

  return (
    <div class="flex h-full flex-col overflow-y-auto px-4 pb-10 no-scrollbar sm:px-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex flex-col gap-1 pb-8 pt-6">
          <h2 class="text-16-medium text-text-strong">{language.t("settings.account.title")}</h2>
        </div>
      </div>
      <Show
        when={auth}
        fallback={<p class="text-13-regular text-text-weak">{language.t("settings.account.desktopOnly")}</p>}
      >
        <div class="flex w-full flex-col gap-8">
          <Show
            when={account()}
            fallback={
              <SettingsList>
                <SettingsRow
                  title={language.t("settings.account.swiftScaleAccount")}
                  description={
                    status().state === "authorizing"
                      ? language.t("settings.account.signIn.authorizing")
                      : language.t("settings.account.signIn.description")
                  }
                >
                  <Button
                    variant="primary"
                    size="small"
                    disabled={busy() || status().state === "authorizing"}
                    onClick={() => void run("login")}
                  >
                    {language.t("settings.account.signIn.action")}
                  </Button>
                </SettingsRow>
              </SettingsList>
            }
          >
            {(current) => (
              <SettingsList>
                <SettingsRow title={swiftScaleAccountDisplayName(current())} description={current().email}>
                  <div class="flex size-8 items-center justify-center rounded-full bg-surface-info-base text-12-medium text-text-base">
                    {current().email.slice(0, 1).toUpperCase()}
                  </div>
                </SettingsRow>
                <SettingsRow
                  title={language.t("settings.account.productAccess.title")}
                  description={language.t("settings.account.productAccess.description")}
                >
                  <span class="text-13-regular text-text-base">{accountProduct(status(), entitlements())}</span>
                </SettingsRow>
              </SettingsList>
            )}
          </Show>

          <Show when={entitlements()}>
            {(plan) => (
              <div class="flex flex-col gap-3" data-slot="swiftscale-entitlements">
                <h3 class="text-15-medium text-text-strong">{language.t("settings.account.plan.title")}</h3>
                <SettingsList>
                  <SettingsRow
                    title={presentation()?.title ?? language.t("settings.account.plan.title")}
                    description={presentationSubtitle(plan())}
                  >
                    <Button
                      size="small"
                      variant="ghost"
                      disabled={entitlementsBusy()}
                      onClick={() => void loadEntitlements(true)}
                    >
                      {language.t("settings.account.refresh")}
                    </Button>
                  </SettingsRow>
                  <Show when={presentation()?.coding}>
                    <SettingsRow title={language.t("settings.account.usage.title")} description={resetLabel()}>
                      <span class="flex items-center gap-2 text-13-regular text-text-base">
                        <span class={`size-2 rounded-full ${usageTone(plan().usage.level)}`} aria-hidden="true" />
                        {usageLabel(plan().usage.level)}
                      </span>
                    </SettingsRow>
                    <SettingsRow
                      title={language.t("settings.account.capacity.codingPlan")}
                      description={language.t("settings.account.capacity.codingDescription", {
                        context: contextLabel(plan().limits.contextTier),
                      })}
                    >
                      <span class="text-13-regular text-text-base">
                        {concurrencyLabel(plan().limits.concurrentTasks)}
                      </span>
                    </SettingsRow>
                  </Show>
                  <Show when={presentation()?.apiServices}>
                    <SettingsRow
                      title={language.t("settings.account.capacity.apiServices")}
                      description={language.t("settings.account.capacity.apiDescription")}
                    >
                      <span class="text-13-regular text-text-base">
                        {concurrencyLabel(apiServiceConcurrency(plan()))}
                      </span>
                    </SettingsRow>
                  </Show>
                  <Show when={presentation()?.apiOnly}>
                    <SettingsRow
                      title={language.t("settings.account.billing.title")}
                      description={language.t("settings.account.billing.description")}
                    >
                      <span class="flex items-center gap-2 text-13-regular text-text-base">
                        <span class="size-2 rounded-full bg-surface-success-strong" aria-hidden="true" />
                        {language.t("settings.account.billing.payg")}
                      </span>
                    </SettingsRow>
                    <SettingsRow
                      title={language.t("settings.account.models.title")}
                      description={language.t("settings.account.models.accountAccess")}
                    >
                      <span class="text-13-regular text-text-base">
                        {language.t("settings.account.models.catalog")}
                      </span>
                    </SettingsRow>
                  </Show>
                  <SettingsRow
                    title={language.t("settings.account.service.title", {
                      status: serviceLabel(plan().service.status),
                    })}
                    description={
                      plan().service.message ||
                      (plan().requestID
                        ? language.t("settings.account.service.requestId", { requestId: plan().requestID ?? "" })
                        : "")
                    }
                  >
                    <div class="flex items-center gap-2">
                      <span
                        class={`size-2 rounded-full ${usageTone(plan().service.status === "operational" ? "available" : plan().service.status === "degraded" ? "limited" : "exhausted")}`}
                      />
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => platform.openExternal("https://swift-scale.com/contact/?topic=service-status")}
                      >
                        {language.t("settings.account.service.status")}
                      </Button>
                      <Button variant="ghost" size="small" onClick={openSupport}>
                        {language.t("settings.account.service.support")}
                      </Button>
                    </div>
                  </SettingsRow>
                  <SettingsRow
                    title={language.t("settings.account.actions.title")}
                    description={language.t("settings.account.actions.description")}
                  >
                    <div class="flex items-center gap-2">
                      <Button variant="ghost" size="small" disabled={busy()} onClick={() => void run("logout")}>
                        {language.t("settings.account.actions.signOut")}
                      </Button>
                      <Button
                        variant={presentation()?.apiOnly || entitlements()?.tier !== "free" ? "secondary" : "primary"}
                        size="small"
                        onClick={openBilling}
                      >
                        {!presentation()?.apiOnly && entitlements()?.tier === "free"
                          ? language.t("settings.account.actions.viewPlans")
                          : language.t("settings.account.actions.manageBilling")}
                      </Button>
                    </div>
                  </SettingsRow>
                </SettingsList>
              </div>
            )}
          </Show>

          <Show when={errorMessage() || entitlementsError()}>
            <div class="rounded-lg bg-surface-critical-base p-4 text-12-regular text-text-critical-base">
              {errorMessage() || entitlementsError()}
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}

export function DialogSwiftScaleAccount(props: { refreshEntitlements?: boolean } = {}) {
  const language = useLanguage()
  return (
    <Dialog title={language.t("settings.account.swiftScaleAccount")} fit>
      <SwiftScaleAccountSettings {...props} />
    </Dialog>
  )
}
