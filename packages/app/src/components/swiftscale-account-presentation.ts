import type { SwiftScaleEntitlements } from "@/context/platform"

const titleCase = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1).replaceAll("_", " ")

export const swiftScaleAccountDisplayName = (account: { email: string; name?: string }) => {
  const email = account.email.trim()
  const name = account.name?.trim()
  if (name && name.toLocaleLowerCase() !== email.toLocaleLowerCase()) return name

  const username = email.split("@", 1)[0]?.trim()
  return username || email
}

export const swiftScaleAccountPresentation = (plan: SwiftScaleEntitlements) => {
  const coding = plan.products?.coding.enabled ?? plan.product === "coding"
  const apiServices = plan.products?.apiServices.enabled ?? plan.product === "api_services"
  const codingTier = plan.products?.coding.tier ?? plan.tier
  const codingSubscription = plan.products?.coding.subscription ?? plan.subscription
  const accountTier = plan.products?.apiServices.accountTier
  const apiOnly = apiServices && !coding

  return {
    coding,
    apiServices,
    apiOnly,
    title: apiOnly ? "API Services" : `SwiftCoder ${titleCase(codingTier)}${apiServices ? " + API Services" : ""}`,
    subtitle: apiOnly
      ? accountTier
        ? `${titleCase(accountTier)} account - Pay as you go`
        : "Pay as you go"
      : `${titleCase(codingSubscription)} subscription${apiServices ? " - API Services PAYG enabled" : ""}`,
  }
}
