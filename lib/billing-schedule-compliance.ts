import type { SelectBillingSchedule } from "@/db/schema"
import {
  getActiveBillingScheduleForBillAction,
  getBillingScheduleByIdAction
} from "@/actions/billing-schedules-actions"
import {
  createOrUpdateScheduleStatusAction,
  getScheduleStatusForPeriodAction
} from "@/actions/billing-schedule-status-actions"

/**
 * Calculate the expected date for a billing schedule for a given period
 */
export function calculateExpectedDate(
  schedule: SelectBillingSchedule,
  year: number,
  month: number
): Date {
  if (schedule.frequency === "monthly") {
    // For monthly schedules, use expectedDayOfMonth
    const day = schedule.expectedDayOfMonth || 1
    // Handle edge cases (e.g., day 31 in months with 30 days)
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const actualDay = Math.min(day, lastDayOfMonth)
    return new Date(year, month - 1, actualDay)
  } else if (schedule.frequency === "weekly") {
    // For weekly schedules, find the next occurrence of expectedDayOfWeek
    const dayOfWeek = schedule.expectedDayOfWeek ?? 0
    const firstDayOfMonth = new Date(year, month - 1, 1)
    const firstDayOfWeek = firstDayOfMonth.getDay()
    
    // Calculate days to add to get to the expected day of week
    let daysToAdd = dayOfWeek - firstDayOfWeek
    if (daysToAdd < 0) {
      daysToAdd += 7 // Next week
    }
    
    return new Date(year, month - 1, 1 + daysToAdd)
  } else {
    // For "once" schedules, use the first day of the month
    return new Date(year, month - 1, 1)
  }
}

/**
 * Get the next expected date for a billing schedule
 * If expected day is today, returns first day of next month (not tomorrow)
 * Always returns a valid Date object
 */
export function getNextExpectedDate(schedule: SelectBillingSchedule): Date {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  let result: Date

  try {
    if (schedule.frequency === "monthly") {
      // Calculate expected date for current month
      const currentExpected = calculateExpectedDate(schedule, currentYear, currentMonth)
      
      // Validate the calculated date
      if (isNaN(currentExpected.getTime())) {
        // Fallback to next month if calculation failed
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
        const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
        result = calculateExpectedDate(schedule, nextYear, nextMonth)
      } else {
        // Normalize dates to start of day for comparison
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const expectedStart = new Date(
          currentExpected.getFullYear(),
          currentExpected.getMonth(),
          currentExpected.getDate()
        )
        
        // If expected date is today or in the past, return next month's expected date
        if (expectedStart <= todayStart) {
          const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
          const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
          result = calculateExpectedDate(schedule, nextYear, nextMonth)
        } else {
          // Expected date is in the future, return it
          result = currentExpected
        }
      }
    } else if (schedule.frequency === "weekly") {
      // For weekly, find next occurrence
      const dayOfWeek = schedule.expectedDayOfWeek ?? 0
      const todayDayOfWeek = now.getDay()
      
      // Calculate days until next occurrence
      let daysUntilNext = dayOfWeek - todayDayOfWeek
      if (daysUntilNext <= 0) {
        // If today is the expected day or it's passed, go to next week
        daysUntilNext += 7
      }
      
      result = new Date(now)
      result.setDate(now.getDate() + daysUntilNext)
    } else {
      // For "once", if expected date has passed, return next month
      const currentExpected = calculateExpectedDate(schedule, currentYear, currentMonth)
      
      // Validate the calculated date
      if (isNaN(currentExpected.getTime())) {
        // Fallback to next month if calculation failed
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
        const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
        result = calculateExpectedDate(schedule, nextYear, nextMonth)
      } else {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const expectedStart = new Date(
          currentExpected.getFullYear(),
          currentExpected.getMonth(),
          currentExpected.getDate()
        )
        
        if (expectedStart <= todayStart) {
          // If "once" schedule date has passed, return next month
          const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
          const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
          result = calculateExpectedDate(schedule, nextYear, nextMonth)
        } else {
          result = currentExpected
        }
      }
    }

    // Final validation - ensure result is a valid date
    if (isNaN(result.getTime())) {
      console.error("Invalid date calculated in getNextExpectedDate, falling back to next month", {
        scheduleId: schedule.id,
        frequency: schedule.frequency
      })
      // Fallback to a safe date (1 month from now)
      result = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }

    return result
  } catch (error) {
    console.error("Error calculating next expected date, using fallback", error)
    // Fallback to a safe date (1 month from now)
    return new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }
}

/**
 * Check if a schedule is late for the current period
 */
export async function checkIfLate(
  scheduleId: string,
  periodYear: number,
  periodMonth: number
): Promise<boolean> {
  const scheduleResult = await getBillingScheduleByIdAction(scheduleId)
  if (!scheduleResult.isSuccess || !scheduleResult.data) {
    return false
  }

  const schedule = scheduleResult.data
  const expectedDate = calculateExpectedDate(schedule, periodYear, periodMonth)
  const now = new Date()

  return now > expectedDate
}

/**
 * Find a matching billing schedule for a bill
 * Returns null if no match found (non-breaking)
 */
export async function findMatchingScheduleForBill(
  propertyId: string,
  billType: "municipality" | "levy" | "utility" | "other",
  billingYear: number | null,
  billingMonth: number | null
): Promise<SelectBillingSchedule | null> {
  // If billing period is not set, cannot match
  if (!billingYear || !billingMonth) {
    return null
  }

  try {
    const schedule = await getActiveBillingScheduleForBillAction(
      propertyId,
      billType,
      billingYear,
      billingMonth
    )
    return schedule
  } catch (error) {
    console.error("Error finding matching schedule:", error)
    return null
  }
}

/**
 * Mark a bill as fulfilling a billing schedule
 * Creates or updates the schedule status record
 */
export async function markBillAsFulfillingSchedule(
  billId: string,
  scheduleId: string,
  billingYear: number,
  billingMonth: number
): Promise<void> {
  try {
    // Get the schedule
    const scheduleResult = await getBillingScheduleByIdAction(scheduleId)
    if (!scheduleResult.isSuccess || !scheduleResult.data) {
      console.error(`Schedule ${scheduleId} not found`)
      return
    }

    const schedule = scheduleResult.data

    // Calculate expected date
    const expectedDate = calculateExpectedDate(schedule, billingYear, billingMonth)
    const actualDate = new Date() // Use current time as actual date (bill was just created)

    // Calculate days late
    const daysLate = Math.floor(
      (actualDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Determine status
    const status = daysLate <= 0 ? "on_time" : "late"

    // Create or update schedule status
    await createOrUpdateScheduleStatusAction({
      scheduleId,
      periodYear: billingYear,
      periodMonth: billingMonth,
      expectedDate,
      actualDate,
      status,
      billId,
      daysLate: daysLate > 0 ? daysLate : 0
    })

    console.log(
      `[Schedule Compliance] Bill ${billId} linked to schedule ${scheduleId} for ${billingYear}-${billingMonth}: ${status} (${daysLate} days)`
    )

    // Update next expected date for this schedule after bill is fulfilled
    try {
      const { updateBillingScheduleAction } = await import("@/actions/billing-schedules-actions")
      const nextExpectedDate = getNextExpectedDate(schedule)
      await updateBillingScheduleAction(scheduleId, { nextExpectedDate })
    } catch (dateUpdateError) {
      console.error("Error updating next expected date:", dateUpdateError)
      // Don't fail - date update is non-critical
    }

    // After marking a bill as fulfilled, check dependencies for invoice/payable schedules
    // This allows blocked schedules to become unblocked when their dependencies are met
    try {
      const { checkDependenciesAndUpdateStatusAction } = await import(
        "@/actions/billing-schedule-status-actions"
      )
      const { getBillingSchedulesForPropertyAction } = await import(
        "@/actions/billing-schedules-actions"
      )

      // Get all schedules for this property
      const schedulesResult = await getBillingSchedulesForPropertyAction(schedule.propertyId)
      if (schedulesResult.isSuccess) {
        // Check dependencies for all invoice and payable output schedules
        for (const s of schedulesResult.data) {
          if (
            (s.scheduleType === "invoice_output" || s.scheduleType === "payable_output") &&
            s.waitForBills
          ) {
            await checkDependenciesAndUpdateStatusAction(s.id, billingYear, billingMonth)
          }
        }
      }
    } catch (dependencyError) {
      // Log but don't fail - dependency checking is non-critical
      console.error("Error checking dependencies after bill fulfillment:", dependencyError)
    }
  } catch (error) {
    console.error("Error marking bill as fulfilling schedule:", error)
    // Don't throw - this is non-critical
  }
}

