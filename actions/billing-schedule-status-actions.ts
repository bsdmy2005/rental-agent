"use server"

import { db } from "@/db"
import {
  billingScheduleStatusTable,
  billingSchedulesTable,
  type InsertBillingScheduleStatus,
  type SelectBillingScheduleStatus
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, inArray } from "drizzle-orm"

export async function createOrUpdateScheduleStatusAction(
  status: InsertBillingScheduleStatus
): Promise<ActionState<SelectBillingScheduleStatus>> {
  try {
    // Check if status already exists for this schedule and period
    const existing = await db.query.billingScheduleStatus.findFirst({
      where: and(
        eq(billingScheduleStatusTable.scheduleId, status.scheduleId),
        eq(billingScheduleStatusTable.periodYear, status.periodYear),
        eq(billingScheduleStatusTable.periodMonth, status.periodMonth)
      )
    })

    if (existing) {
      // Update existing status
      const [updatedStatus] = await db
        .update(billingScheduleStatusTable)
        .set({
          expectedDate: status.expectedDate,
          actualDate: status.actualDate,
          status: status.status,
          billId: status.billId,
          invoiceId: status.invoiceId,
          payableId: status.payableId,
          daysLate: status.daysLate,
          blockedBy: (status as any).blockedBy || null,
          updatedAt: new Date()
        })
        .where(eq(billingScheduleStatusTable.id, existing.id))
        .returning()

      return {
        isSuccess: true,
        message: "Schedule status updated successfully",
        data: updatedStatus
      }
    } else {
      // Create new status
      const [newStatus] = await db
        .insert(billingScheduleStatusTable)
        .values(status)
        .returning()

      return {
        isSuccess: true,
        message: "Schedule status created successfully",
        data: newStatus
      }
    }
  } catch (error) {
    console.error("Error creating/updating schedule status:", error)
    return { isSuccess: false, message: "Failed to create/update schedule status" }
  }
}

export async function getScheduleStatusForPropertyAction(
  propertyId: string,
  periodYear?: number,
  periodMonth?: number
): Promise<ActionState<SelectBillingScheduleStatus[]>> {
  try {
    // Get all schedules for property first
    const schedules = await db.query.billingSchedules.findMany({
      where: eq(billingSchedulesTable.propertyId, propertyId)
    })

    const scheduleIds = schedules.map((s) => s.id)

    if (scheduleIds.length === 0) {
      return {
        isSuccess: true,
        message: "No schedules found for property",
        data: []
      }
    }

    // Build where conditions
    const conditions: any[] = [inArray(billingScheduleStatusTable.scheduleId, scheduleIds)]

    if (periodYear && periodMonth) {
      conditions.push(
        eq(billingScheduleStatusTable.periodYear, periodYear),
        eq(billingScheduleStatusTable.periodMonth, periodMonth)
      )
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)

    const statuses = await db.query.billingScheduleStatus.findMany({
      where: whereClause,
      orderBy: (status, { desc }) => [
        desc(status.periodYear),
        desc(status.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Schedule statuses retrieved successfully",
      data: statuses
    }
  } catch (error) {
    console.error("Error getting schedule statuses:", error)
    return { isSuccess: false, message: "Failed to get schedule statuses" }
  }
}

export async function getScheduleStatusForPeriodAction(
  scheduleId: string,
  periodYear: number,
  periodMonth: number
): Promise<ActionState<SelectBillingScheduleStatus | null>> {
  try {
    const status = await db.query.billingScheduleStatus.findFirst({
      where: and(
        eq(billingScheduleStatusTable.scheduleId, scheduleId),
        eq(billingScheduleStatusTable.periodYear, periodYear),
        eq(billingScheduleStatusTable.periodMonth, periodMonth)
      )
    })

    return {
      isSuccess: true,
      message: "Schedule status retrieved successfully",
      data: status || null
    }
  } catch (error) {
    console.error("Error getting schedule status:", error)
    return { isSuccess: false, message: "Failed to get schedule status" }
  }
}

/**
 * Check dependencies and update schedule status accordingly
 * This should be called when creating/updating invoice or payable schedules
 */
export async function checkDependenciesAndUpdateStatusAction(
  scheduleId: string,
  periodYear: number,
  periodMonth: number
): Promise<ActionState<SelectBillingScheduleStatus | null>> {
  try {
    const { updateScheduleStatusForDependencies } = await import("@/lib/billing-schedule-dependencies")
    const updatedStatus = await updateScheduleStatusForDependencies(scheduleId, periodYear, periodMonth)

    if (updatedStatus) {
      return {
        isSuccess: true,
        message: "Schedule status updated based on dependencies",
        data: updatedStatus
      }
    }

    return {
      isSuccess: true,
      message: "No status update needed",
      data: null
    }
  } catch (error) {
    console.error("Error checking dependencies and updating status:", error)
    return { isSuccess: false, message: "Failed to check dependencies" }
  }
}

export async function checkAndUpdateLateStatusAction(): Promise<ActionState<number>> {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Get all pending statuses where expected date has passed
    const pendingStatuses = await db.query.billingScheduleStatus.findMany({
      where: and(
        eq(billingScheduleStatusTable.status, "pending"),
        // Expected date is in the past
        // Note: This is a simplified check - in production, use proper date comparison
      )
    })

    let updatedCount = 0

    for (const status of pendingStatuses) {
      if (status.expectedDate && new Date(status.expectedDate) < now) {
        // Calculate days late
        const daysLate = Math.floor(
          (now.getTime() - new Date(status.expectedDate).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Update status to 'late' if no actual date, or 'missed' if expected date passed with no fulfillment
        const newStatus = status.actualDate ? "late" : "missed"

        await db
          .update(billingScheduleStatusTable)
          .set({
            status: newStatus,
            daysLate: daysLate > 0 ? daysLate : 0,
            updatedAt: new Date()
          })
          .where(eq(billingScheduleStatusTable.id, status.id))

        updatedCount++
      }
    }

    return {
      isSuccess: true,
      message: `Updated ${updatedCount} late schedule statuses`,
      data: updatedCount
    }
  } catch (error) {
    console.error("Error checking and updating late status:", error)
    return { isSuccess: false, message: "Failed to check late statuses" }
  }
}

