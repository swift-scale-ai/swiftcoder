import { createSignal, onCleanup, onMount } from "solid-js"
import { usePlatform, type SwiftScaleAuthStatus } from "@/context/platform"

export function useSwiftScaleAuthStatus() {
  const platform = usePlatform()
  const [status, setStatus] = createSignal<SwiftScaleAuthStatus>()

  onMount(() => {
    const auth = platform.swiftScaleAuth
    if (!auth) return
    void auth.status().then(setStatus)
    const unsubscribe = auth.subscribe(setStatus)
    onCleanup(unsubscribe)
  })

  return { status, available: Boolean(platform.swiftScaleAuth) }
}
