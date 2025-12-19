import { db } from "@/db"
import { billingSchedulesTable } from "@/db/schema"
import { getNextExpectedDate } from "./billing-schedule-compliance"
import { eq } from "drizzle-orm"

/**
 * Update next expected date for a specific schedule
 */
export async function updateNextExpectedDateForSchedule(scheduleId: string): Promise<void> {
  try {
    const schedule = await db.query.billingSchedules.findFirst({
      where: eq(billingSchedulesTable.id, scheduleId)
    })

    if (!schedule) {
      console.error(`Schedule ${scheduleId} not found`)
      return
    }

    const nextExpectedDate = getNextExpectedDate(schedule)

    await db
      .update(billingSchedulesTable)
      .set({ nextExpectedDate })
      .where(eq(billingSchedulesTable.id, scheduleId))

    console.log(`Updated next expected date for schedule ${scheduleId}: ${nextExpectedDate.toISOString()}`)
  } catch (error) {
    console.error(`Error updating next expected date for schedule ${scheduleId}:`, error)
  }
}

/**
 * Backfill next expected dates for all active schedules
 * Useful for migrating existing schedules
 */
export async function backfillNextExpectedDates(): Promise<void> {
  try {
    const schedules = await db.query.billingSchedules.findMany({
      where: eq(billingSchedulesTable.isActive, true)
    })

    console.log(`Backfilling next expected dates for ${schedules.length} schedules...`)

    for (const schedule of schedules) {
      const nextExpectedDate = getNextExpectedDate(schedule)
      await db
        .update(billingSchedulesTable)
        .set({ nextExpectedDate })
        .where(eq(billingSchedulesTable.id, schedule.id))
    }

    console.log(`Successfully backfilled next expected dates for ${schedules.length} schedules`)
  } catch (error) {
    console.error("Error backfilling next expected dates:", error)
    throw error
  }
}

