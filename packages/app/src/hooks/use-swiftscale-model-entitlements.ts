import { createSignal, onCleanup, onMount } from "solid-js"
import { usePlatform, type SwiftScaleAuthStatus, type SwiftScaleEntitlements } from "@/context/platform"

export function useSwiftScaleModelEntitlements() {
  const platform = usePlatform()
  const [entitlements, setEntitlements] = createSignal<SwiftScaleEntitlements>()
  const [loading, setLoading] = createSignal(Boolean(platform.swiftScaleAuth))
  let request = 0

  const update = (status: SwiftScaleAuthStatus) => {
    const current = ++request
    setEntitlements(undefined)
    if (status.state !== "signed_in") {
      setLoading(false)
      return
    }

    setLoading(true)
    void platform.swiftScaleAuth
      ?.entitlements()
      .then((value) => {
        if (current === request) setEntitlements(value)
      })
      .catch(() => {
        if (current === request) setEntitlements(undefined)
      })
      .finally(() => {
        if (current === request) setLoading(false)
      })
  }

  onMount(() => {
    const auth = platform.swiftScaleAuth
    if (!auth) return
    void auth.status().then(update)
    const unsubscribe = auth.subscribe(update)
    onCleanup(() => {
      request++
      unsubscribe()
    })
  })

  const products = () => {
    if (!platform.swiftScaleAuth) return undefined
    return (
      entitlements()?.products ?? {
        coding: { enabled: false, models: [] },
        apiServices: { enabled: false, models: [], billing: "payg" as const },
      }
    )
  }

  return { entitlements, products, loading }
}
