"use server"

import { db } from "@/db"
import {
  payableSchedulesTable,
  type InsertPayableSchedule,
  type SelectPayableSchedule
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createPayableScheduleAction(
  schedule: InsertPayableSchedule
): Promise<ActionState<SelectPayableSchedule>> {
  try {
    const [newSchedule] = await db
      .insert(payableSchedulesTable)
      .values(schedule)
      .returning()

    return {
      isSuccess: true,
      message: "Payable schedule created successfully",
      data: newSchedule
    }
  } catch (error) {
    console.error("Error creating payable schedule:", error)
    return { isSuccess: false, message: "Failed to create payable schedule" }
  }
}

export async function getPayableScheduleByTemplateIdAction(
  payableTemplateId: string
): Promise<ActionState<SelectPayableSchedule | null>> {
  try {
    const schedule = await db.query.payableSchedules.findFirst({
      where: eq(payableSchedulesTable.payableTemplateId, payableTemplateId)
    })

    return {
      isSuccess: true,
      message: "Payable schedule retrieved successfully",
      data: schedule || null
    }
  } catch (error) {
    console.error("Error getting payable schedule:", error)
    return { isSuccess: false, message: "Failed to get payable schedule" }
  }
}

export async function getPayableSchedulesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectPayableSchedule[]>> {
  try {
    const schedules = await db.query.payableSchedules.findMany({
      where: eq(payableSchedulesTable.propertyId, propertyId),
      orderBy: (schedules, { asc }) => [asc(schedules.createdAt)]
    })

    return {
      isSuccess: true,
      message: "Payable schedules retrieved successfully",
      data: schedules
    }
  } catch (error) {
    console.error("Error getting payable schedules:", error)
    return { isSuccess: false, message: "Failed to get payable schedules" }
  }
}

export async function updatePayableScheduleAction(
  scheduleId: string,
  data: Partial<InsertPayableSchedule>
): Promise<ActionState<SelectPayableSchedule>> {
  try {
    const [updatedSchedule] = await db
      .update(payableSchedulesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payableSchedulesTable.id, scheduleId))
      .returning()

    if (!updatedSchedule) {
      return { isSuccess: false, message: "Payable schedule not found" }
    }

    return {
      isSuccess: true,
      message: "Payable schedule updated successfully",
      data: updatedSchedule
    }
  } catch (error) {
    console.error("Error updating payable schedule:", error)
    return { isSuccess: false, message: "Failed to update payable schedule" }
  }
}

export async function deletePayableScheduleAction(
  scheduleId: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(payableSchedulesTable)
      .where(eq(payableSchedulesTable.id, scheduleId))

    return {
      isSuccess: true,
      message: "Payable schedule deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting payable schedule:", error)
    return { isSuccess: false, message: "Failed to delete payable schedule" }
  }
}

