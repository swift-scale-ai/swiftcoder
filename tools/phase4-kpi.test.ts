import { describe, expect, test } from "bun:test"
import { phase4KPIReport } from "./phase4-kpi"

const policy = {
  activationRate: 0.6,
  taskSuccessRate: 0.9,
  crashFreeSessionRate: 0.99,
  recoveryRate: 0.99,
  grossMarginRate: 0.55,
}

describe("Phase 4 KPI report", () => {
  test("uses one fixed commercial review denominator per metric", () => {
    const report = phase4KPIReport(
      {
        opened: 100,
        activated: 70,
        tasksCompleted: 900,
        tasksFailed: 100,
        crashes: 1,
        sessions: 1000,
        recoveriesAttempted: 100,
        recoveriesSucceeded: 99,
        d1Eligible: 80,
        d1Retained: 40,
        d7Eligible: 50,
        d7Retained: 15,
        freeEligible: 100,
        paidConversions: 5,
        revenue: 1000,
        inferenceCost: 400,
      },
      policy,
    )
    expect(report.metrics).toMatchObject({ activationRate: 0.7, taskSuccessRate: 0.9, paidConversionRate: 0.05 })
    expect(report.passed).toBe(true)
  })

  test("fails a release gate below policy without hiding retention indicators", () => {
    const report = phase4KPIReport(
      {
        opened: 10,
        activated: 2,
        tasksCompleted: 1,
        tasksFailed: 1,
        crashes: 1,
        sessions: 10,
        recoveriesAttempted: 1,
        recoveriesSucceeded: 0,
        d1Eligible: 2,
        d1Retained: 1,
        d7Eligible: 0,
        d7Retained: 0,
        freeEligible: 10,
        paidConversions: 0,
        revenue: 10,
        inferenceCost: 9,
      },
      policy,
    )
    expect(report.passed).toBe(false)
    expect(report.metrics.d1RetentionRate).toBe(0.5)
    expect(report.metrics.d7RetentionRate).toBe(0)
  })
})
