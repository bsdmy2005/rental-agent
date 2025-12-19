import type { SelectBillingSchedule, SelectBillingScheduleStatus } from "@/db/schema"
import { db } from "@/db"
import { billingSchedulesTable, billingScheduleStatusTable } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

/**
 * Check if all dependencies for a schedule are met for a given period
 * Returns whether dependencies are met and which schedules are blocking
 */
export async function checkDependenciesMet(
  scheduleId: string,
  periodYear: number,
  periodMonth: number
): Promise<{ met: boolean; blockingSchedules: string[] }> {
  // Get the schedule
  const schedule = await db.query.billingSchedules.findFirst({
    where: eq(billingSchedulesTable.id, scheduleId)
  })

  if (!schedule) {
    return { met: false, blockingSchedules: [] }
  }

  // If schedule doesn't wait for bills, dependencies are always met
  if (!schedule.waitForBills) {
    return { met: true, blockingSchedules: [] }
  }

  // Get dependent bill schedule IDs
  const dependsOnBillSchedules = schedule.dependsOnBillSchedules as string[] | null | undefined

  if (!dependsOnBillSchedules || dependsOnBillSchedules.length === 0) {
    // If waitForBills is true but no dependencies specified, check all bill_input schedules for the property
    const allBillSchedules = await db.query.billingSchedules.findMany({
      where: and(
        eq(billingSchedulesTable.propertyId, schedule.propertyId),
        eq(billingSchedulesTable.scheduleType, "bill_input"),
        eq(billingSchedulesTable.isActive, true)
      )
    })

    const allBillScheduleIds = allBillSchedules.map((s) => s.id)
    return checkScheduleStatuses(allBillScheduleIds, periodYear, periodMonth)
  }

  // Check specific dependencies
  return checkScheduleStatuses(dependsOnBillSchedules, periodYear, periodMonth)
}

/**
 * Check if the given schedule IDs have been fulfilled for the period
 */
async function checkScheduleStatuses(
  scheduleIds: string[],
  periodYear: number,
  periodMonth: number
): Promise<{ met: boolean; blockingSchedules: string[] }> {
  if (scheduleIds.length === 0) {
    return { met: true, blockingSchedules: [] }
  }

  // Get statuses for all dependent schedules
  const statuses = await db.query.billingScheduleStatus.findMany({
    where: and(
      inArray(billingScheduleStatusTable.scheduleId, scheduleIds),
      eq(billingScheduleStatusTable.periodYear, periodYear),
      eq(billingScheduleStatusTable.periodMonth, periodMonth)
    )
  })

  // Check which schedules are fulfilled (on_time or late means fulfilled)
  const fulfilledStatuses = ["on_time", "late"]
  const blockingSchedules: string[] = []

  for (const scheduleId of scheduleIds) {
    const status = statuses.find((s) => s.scheduleId === scheduleId)

    if (!status || !fulfilledStatuses.includes(status.status)) {
      // Schedule not fulfilled - it's blocking
      blockingSchedules.push(scheduleId)
    }
  }

  return {
    met: blockingSchedules.length === 0,
    blockingSchedules
  }
}

/**
 * Get list of schedules that are blocking a given schedule
 */
export async function getBlockingDependencies(
  scheduleId: string,
  periodYear: number,
  periodMonth: number
): Promise<SelectBillingSchedule[]> {
  const { blockingSchedules } = await checkDependenciesMet(scheduleId, periodYear, periodMonth)

  if (blockingSchedules.length === 0) {
    return []
  }

  // Fetch the actual schedule records
  const schedules = await db.query.billingSchedules.findMany({
    where: inArray(billingSchedulesTable.id, blockingSchedules)
  })

  return schedules
}

/**
 * Determine if an invoice can be generated for a given schedule and period
 */
export async function canGenerateInvoice(
  scheduleId: string,
  periodYear: number,
  periodMonth: number
): Promise<{ canGenerate: boolean; reason?: string; blockingSchedules?: string[] }> {
  const schedule = await db.query.billingSchedules.findFirst({
    where: eq(billingSchedulesTable.id, scheduleId)
  })

  if (!schedule) {
    return { canGenerate: false, reason: "Schedule not found" }
  }

  // Only invoice_output schedules can generate invoices
  if (schedule.scheduleType !== "invoice_output") {
    return { canGenerate: false, reason: "Schedule is not an invoice output schedule" }
  }

  // Check dependencies
  const { met, blockingSchedules } = await checkDependenciesMet(scheduleId, periodYear, periodMonth)

  if (!met) {
    const blockingScheduleNames = await Promise.all(
      blockingSchedules.map(async (id) => {
        const s = await db.query.billingSchedules.findFirst({
          where: eq(billingSchedulesTable.id, id)
        })
        return s ? `${s.billType || "unknown"} bill schedule` : id
      })
    )

    return {
      canGenerate: false,
      reason: `Waiting for dependencies: ${blockingScheduleNames.join(", ")}`,
      blockingSchedules
    }
  }

  return { canGenerate: true }
}

/**
 * Determine if a payable can be generated for a given schedule and period
 */
export async function canGeneratePayable(
  scheduleId: string,
  periodYear: number,
  periodMonth: number
): Promise<{ canGenerate: boolean; reason?: string; blockingSchedules?: string[] }> {
  const schedule = await db.query.billingSchedules.findFirst({
    where: eq(billingSchedulesTable.id, scheduleId)
  })

  if (!schedule) {
    return { canGenerate: false, reason: "Schedule not found" }
  }

  // Only payable_output schedules can generate payables
  if (schedule.scheduleType !== "payable_output") {
    return { canGenerate: false, reason: "Schedule is not a payable output schedule" }
  }

  // Check dependencies
  const { met, blockingSchedules } = await checkDependenciesMet(scheduleId, periodYear, periodMonth)

  if (!met) {
    const blockingScheduleNames = await Promise.all(
      blockingSchedules.map(async (id) => {
        const s = await db.query.billingSchedules.findFirst({
          where: eq(billingSchedulesTable.id, id)
        })
        return s ? `${s.billType || "unknown"} bill schedule` : id
      })
    )

    return {
      canGenerate: false,
      reason: `Waiting for dependencies: ${blockingScheduleNames.join(", ")}`,
      blockingSchedules
    }
  }

  return { canGenerate: true }
}

/**
 * Update schedule status to blocked if dependencies are not met
 * Returns the updated status
 */
export async function updateScheduleStatusForDependencies(
  scheduleId: string,
  periodYear: number,
  periodMonth: number
): Promise<SelectBillingScheduleStatus | null> {
  const schedule = await db.query.billingSchedules.findFirst({
    where: eq(billingSchedulesTable.id, scheduleId)
  })

  if (!schedule) {
    return null
  }

  // Only check dependencies for invoice_output and payable_output schedules
  if (schedule.scheduleType === "bill_input") {
    return null
  }

  // Check if dependencies are met
  const { met, blockingSchedules } = await checkDependenciesMet(scheduleId, periodYear, periodMonth)

  // Get current status
  const currentStatus = await db.query.billingScheduleStatus.findFirst({
    where: and(
      eq(billingScheduleStatusTable.scheduleId, scheduleId),
      eq(billingScheduleStatusTable.periodYear, periodYear),
      eq(billingScheduleStatusTable.periodMonth, periodMonth)
    )
  })

  if (!currentStatus) {
    // No status record exists yet, create one with blocked status if dependencies not met
    if (!met) {
      const { createOrUpdateScheduleStatusAction } = await import("@/actions/billing-schedule-status-actions")
      const { calculateExpectedDate } = await import("./billing-schedule-compliance")

      const expectedDate = calculateExpectedDate(schedule, periodYear, periodMonth)

      const result = await createOrUpdateScheduleStatusAction({
        scheduleId,
        periodYear,
        periodMonth,
        expectedDate,
        actualDate: null,
        status: "blocked",
        daysLate: null,
        blockedBy: blockingSchedules.length > 0 ? blockingSchedules : null
      })

      return result.isSuccess ? result.data : null
    }
    return null
  }

  // Update existing status
  if (!met && currentStatus.status !== "blocked") {
    // Dependencies not met - set to blocked
    const { createOrUpdateScheduleStatusAction } = await import("@/actions/billing-schedule-status-actions")

    const result = await createOrUpdateScheduleStatusAction({
      ...currentStatus,
      status: "blocked",
      blockedBy: blockingSchedules.length > 0 ? blockingSchedules : null
    })

    return result.isSuccess ? result.data : null
  } else if (met && currentStatus.status === "blocked") {
    // Dependencies are now met - change from blocked to pending
    const { createOrUpdateScheduleStatusAction } = await import("@/actions/billing-schedule-status-actions")

    const result = await createOrUpdateScheduleStatusAction({
      ...currentStatus,
      status: "pending",
      blockedBy: null
    })

    return result.isSuccess ? result.data : null
  }

  return currentStatus
}

