export type Phase4KPIInput = {
  opened: number
  activated: number
  tasksCompleted: number
  tasksFailed: number
  crashes: number
  sessions: number
  recoveriesAttempted: number
  recoveriesSucceeded: number
  d1Eligible: number
  d1Retained: number
  d7Eligible: number
  d7Retained: number
  freeEligible: number
  paidConversions: number
  revenue: number
  inferenceCost: number
}

export type Phase4KPIPolicy = {
  activationRate: number
  taskSuccessRate: number
  crashFreeSessionRate: number
  recoveryRate: number
  grossMarginRate: number
}

const ratio = (numerator: number, denominator: number) => (denominator > 0 ? numerator / denominator : 0)

export function phase4KPIReport(input: Phase4KPIInput, policy: Phase4KPIPolicy) {
  const metrics = {
    activationRate: ratio(input.activated, input.opened),
    taskSuccessRate: ratio(input.tasksCompleted, input.tasksCompleted + input.tasksFailed),
    crashFreeSessionRate: 1 - ratio(input.crashes, input.sessions),
    recoveryRate: ratio(input.recoveriesSucceeded, input.recoveriesAttempted),
    d1RetentionRate: ratio(input.d1Retained, input.d1Eligible),
    d7RetentionRate: ratio(input.d7Retained, input.d7Eligible),
    paidConversionRate: ratio(input.paidConversions, input.freeEligible),
    grossMarginRate: ratio(input.revenue - input.inferenceCost, input.revenue),
  }
  const gates = Object.fromEntries(
    (Object.keys(policy) as Array<keyof Phase4KPIPolicy>).map((name) => [name, metrics[name] >= policy[name]]),
  ) as Record<keyof Phase4KPIPolicy, boolean>
  return { metrics, gates, passed: Object.values(gates).every(Boolean) }
}
