"use server"

import { db } from "@/db"
import {
  billingSchedulesTable,
  type InsertBillingSchedule,
  type SelectBillingSchedule
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

export async function createBillingScheduleAction(
  schedule: InsertBillingSchedule
): Promise<ActionState<SelectBillingSchedule>> {
  try {
    // Calculate next expected date before inserting
    const { getNextExpectedDate } = await import("@/lib/billing-schedule-compliance")
    const scheduleWithNextDate = {
      ...schedule,
      nextExpectedDate: schedule.nextExpectedDate || getNextExpectedDate(schedule as SelectBillingSchedule)
    }

    const [newSchedule] = await db
      .insert(billingSchedulesTable)
      .values(scheduleWithNextDate)
      .returning()

    if (!newSchedule) {
      return { isSuccess: false, message: "Failed to create billing schedule" }
    }

    // If this is an invoice/payable schedule with dependencies, check them
    if (
      (newSchedule.scheduleType === "invoice_output" || newSchedule.scheduleType === "payable_output") &&
      newSchedule.waitForBills
    ) {
      try {
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        const { checkDependenciesAndUpdateStatusAction } = await import(
          "@/actions/billing-schedule-status-actions"
        )
        await checkDependenciesAndUpdateStatusAction(newSchedule.id, currentYear, currentMonth)
      } catch (error) {
        console.error("Error checking dependencies after schedule creation:", error)
        // Don't fail - this is non-critical
      }
    }

    return {
      isSuccess: true,
      message: "Billing schedule created successfully",
      data: newSchedule
    }
  } catch (error) {
    console.error("Error creating billing schedule:", error)
    return { isSuccess: false, message: "Failed to create billing schedule" }
  }
}

export async function updateBillingScheduleAction(
  scheduleId: string,
  data: Partial<InsertBillingSchedule>
): Promise<ActionState<SelectBillingSchedule>> {
  try {
    // Get current schedule to calculate next expected date if frequency/day changed
    const currentSchedule = await db.query.billingSchedules.findFirst({
      where: eq(billingSchedulesTable.id, scheduleId)
    })

    // Calculate next expected date if schedule parameters changed
    let updateData = { ...data }
    if (currentSchedule && (
      data.frequency !== undefined ||
      data.expectedDayOfMonth !== undefined ||
      data.expectedDayOfWeek !== undefined
    )) {
      const { getNextExpectedDate } = await import("@/lib/billing-schedule-compliance")
      const mergedSchedule = { ...currentSchedule, ...data } as SelectBillingSchedule
      updateData.nextExpectedDate = getNextExpectedDate(mergedSchedule)
    }

    const [updatedSchedule] = await db
      .update(billingSchedulesTable)
      .set(updateData)
      .where(eq(billingSchedulesTable.id, scheduleId))
      .returning()

    if (!updatedSchedule) {
      return { isSuccess: false, message: "Billing schedule not found" }
    }

    // If this is an invoice/payable schedule with dependencies, check them
    if (
      (updatedSchedule.scheduleType === "invoice_output" || updatedSchedule.scheduleType === "payable_output") &&
      updatedSchedule.waitForBills
    ) {
      try {
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        const { checkDependenciesAndUpdateStatusAction } = await import(
          "@/actions/billing-schedule-status-actions"
        )
        await checkDependenciesAndUpdateStatusAction(updatedSchedule.id, currentYear, currentMonth)
      } catch (error) {
        console.error("Error checking dependencies after schedule update:", error)
        // Don't fail - this is non-critical
      }
    }

    return {
      isSuccess: true,
      message: "Billing schedule updated successfully",
      data: updatedSchedule
    }
  } catch (error) {
    console.error("Error updating billing schedule:", error)
    return { isSuccess: false, message: "Failed to update billing schedule" }
  }
}

export async function getBillingSchedulesForPropertyAction(
  propertyId: string
): Promise<ActionState<SelectBillingSchedule[]>> {
  try {
    const schedules = await db.query.billingSchedules.findMany({
      where: eq(billingSchedulesTable.propertyId, propertyId),
      orderBy: (schedules, { asc }) => [
        asc(schedules.scheduleType),
        asc(schedules.billType)
      ]
    })

    return {
      isSuccess: true,
      message: "Billing schedules retrieved successfully",
      data: schedules
    }
  } catch (error) {
    console.error("Error getting billing schedules:", error)
    return { isSuccess: false, message: "Failed to get billing schedules" }
  }
}

export async function getBillingScheduleByIdAction(
  scheduleId: string
): Promise<ActionState<SelectBillingSchedule>> {
  try {
    const schedule = await db.query.billingSchedules.findFirst({
      where: eq(billingSchedulesTable.id, scheduleId)
    })

    if (!schedule) {
      return { isSuccess: false, message: "Billing schedule not found" }
    }

    return {
      isSuccess: true,
      message: "Billing schedule retrieved successfully",
      data: schedule
    }
  } catch (error) {
    console.error("Error getting billing schedule:", error)
    return { isSuccess: false, message: "Failed to get billing schedule" }
  }
}

export async function deleteBillingScheduleAction(
  scheduleId: string
): Promise<ActionState<void>> {
  try {
    await db.delete(billingSchedulesTable).where(eq(billingSchedulesTable.id, scheduleId))

    return {
      isSuccess: true,
      message: "Billing schedule deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting billing schedule:", error)
    return { isSuccess: false, message: "Failed to delete billing schedule" }
  }
}

export async function getActiveBillingScheduleForBillAction(
  propertyId: string,
  billType: "municipality" | "levy" | "utility" | "other",
  billingYear: number,
  billingMonth: number
): Promise<SelectBillingSchedule | null> {
  try {
    const schedule = await db.query.billingSchedules.findFirst({
      where: and(
        eq(billingSchedulesTable.propertyId, propertyId),
        eq(billingSchedulesTable.scheduleType, "bill_input"),
        eq(billingSchedulesTable.billType, billType),
        eq(billingSchedulesTable.isActive, true)
      )
    })

    return schedule || null
  } catch (error) {
    console.error("Error finding matching billing schedule:", error)
    return null
  }
}

