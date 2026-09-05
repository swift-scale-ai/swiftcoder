export function isIdleSessionStatus(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  return Object.values(value).every(
    (status) => Boolean(status) && typeof status === "object" && (status as { type?: unknown }).type === "idle",
  )
}
