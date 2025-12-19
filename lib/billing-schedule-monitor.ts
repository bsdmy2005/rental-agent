import { db } from "@/db"
import { billingSchedulesTable, billingScheduleStatusTable } from "@/db/schema"
import { eq, and, lt } from "drizzle-orm"
import { calculateExpectedDate } from "./billing-schedule-compliance"
import {
  createOrUpdateScheduleStatusAction
} from "@/actions/billing-schedule-status-actions"

/**
 * Check all active schedules and mark as late if overdue
 * This should be called periodically (e.g., daily via cron job)
 */
export async function checkAllSchedulesForLateStatus(): Promise<{
  checked: number
  markedLate: number
  markedMissed: number
}> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Get all active schedules
  const activeSchedules = await db.query.billingSchedules.findMany({
    where: eq(billingSchedulesTable.isActive, true)
  })

  let markedLate = 0
  let markedMissed = 0

  for (const schedule of activeSchedules) {
    // Calculate expected date for current period
    const expectedDate = calculateExpectedDate(schedule, currentYear, currentMonth)

    // Skip if expected date hasn't arrived yet
    if (expectedDate > now) {
      continue
    }

    // Check if status already exists for this period
    const existingStatus = await db.query.billingScheduleStatus.findFirst({
      where: and(
        eq(billingScheduleStatusTable.scheduleId, schedule.id),
        eq(billingScheduleStatusTable.periodYear, currentYear),
        eq(billingScheduleStatusTable.periodMonth, currentMonth)
      )
    })

    if (existingStatus) {
      // Update existing status if it's still pending and date has passed
      if (existingStatus.status === "pending" && !existingStatus.actualDate) {
        const daysLate = Math.floor(
          (now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        await createOrUpdateScheduleStatusAction({
          scheduleId: schedule.id,
          periodYear: currentYear,
          periodMonth: currentMonth,
          expectedDate,
          actualDate: null,
          status: "missed",
          daysLate: daysLate > 0 ? daysLate : 0
        })

        markedMissed++
      }
    } else {
      // Create new status record as missed
      const daysLate = Math.floor(
        (now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      await createOrUpdateScheduleStatusAction({
        scheduleId: schedule.id,
        periodYear: currentYear,
        periodMonth: currentMonth,
        expectedDate,
        actualDate: null,
        status: "missed",
        daysLate: daysLate > 0 ? daysLate : 0
      })

      markedMissed++
    }
  }

  return {
    checked: activeSchedules.length,
    markedLate,
    markedMissed
  }
}

/**
 * Generate schedule status records for upcoming periods
 * This can be called to pre-populate status records for future periods
 */
export async function generateScheduleStatusForPeriod(
  year: number,
  month: number
): Promise<number> {
  const activeSchedules = await db.query.billingSchedules.findMany({
    where: eq(billingSchedulesTable.isActive, true)
  })

  let created = 0

  for (const schedule of activeSchedules) {
    // Check if status already exists
    const existingStatus = await db.query.billingScheduleStatus.findFirst({
      where: and(
        eq(billingScheduleStatusTable.scheduleId, schedule.id),
        eq(billingScheduleStatusTable.periodYear, year),
        eq(billingScheduleStatusTable.periodMonth, month)
      )
    })

    if (!existingStatus) {
      // Create pending status for this period
      const expectedDate = calculateExpectedDate(schedule, year, month)

      await createOrUpdateScheduleStatusAction({
        scheduleId: schedule.id,
        periodYear: year,
        periodMonth: month,
        expectedDate,
        actualDate: null,
        status: "pending",
        daysLate: null
      })

      created++
    }
  }

  return created
}

