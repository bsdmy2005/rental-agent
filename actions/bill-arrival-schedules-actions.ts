"use server"

import { db } from "@/db"
import {
  billArrivalSchedulesTable,
  type InsertBillArrivalSchedule,
  type SelectBillArrivalSchedule
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

export async function createBillArrivalScheduleAction(
  schedule: InsertBillArrivalSchedule
): Promise<ActionState<SelectBillArrivalSchedule>> {
  try {
    const [newSchedule] = await db
      .insert(billArrivalSchedulesTable)
      .values(schedule)
      .returning()

    return {
      isSuccess: true,
      message: "Bill arrival schedule created successfully",
      data: newSchedule
    }
  } catch (error) {
    console.error("Error creating bill arrival schedule:", error)
    return {
      isSuccess: false,
      message: "Failed to create bill arrival schedule"
    }
  }
}

export async function getBillArrivalScheduleByTemplateIdAction(
  billTemplateId: string
): Promise<ActionState<SelectBillArrivalSchedule | null>> {
  try {
    const schedule = await db.query.billArrivalSchedules.findFirst({
      where: eq(billArrivalSchedulesTable.billTemplateId, billTemplateId)
    })

    return {
      isSuccess: true,
      message: "Bill arrival schedule retrieved successfully",
      data: schedule || null
    }
  } catch (error) {
    console.error("Error getting bill arrival schedule:", error)
    return {
      isSuccess: false,
      message: "Failed to get bill arrival schedule"
    }
  }
}

export async function getBillArrivalSchedulesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectBillArrivalSchedule[]>> {
  try {
    const schedules = await db.query.billArrivalSchedules.findMany({
      where: eq(billArrivalSchedulesTable.propertyId, propertyId),
      orderBy: (schedules, { asc }) => [asc(schedules.createdAt)]
    })

    return {
      isSuccess: true,
      message: "Bill arrival schedules retrieved successfully",
      data: schedules
    }
  } catch (error) {
    console.error("Error getting bill arrival schedules:", error)
    return {
      isSuccess: false,
      message: "Failed to get bill arrival schedules"
    }
  }
}

export async function updateBillArrivalScheduleAction(
  scheduleId: string,
  data: Partial<InsertBillArrivalSchedule>
): Promise<ActionState<SelectBillArrivalSchedule>> {
  try {
    const [updatedSchedule] = await db
      .update(billArrivalSchedulesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(billArrivalSchedulesTable.id, scheduleId))
      .returning()

    if (!updatedSchedule) {
      return { isSuccess: false, message: "Bill arrival schedule not found" }
    }

    return {
      isSuccess: true,
      message: "Bill arrival schedule updated successfully",
      data: updatedSchedule
    }
  } catch (error) {
    console.error("Error updating bill arrival schedule:", error)
    return {
      isSuccess: false,
      message: "Failed to update bill arrival schedule"
    }
  }
}

export async function deleteBillArrivalScheduleAction(
  scheduleId: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(billArrivalSchedulesTable)
      .where(eq(billArrivalSchedulesTable.id, scheduleId))

    return {
      isSuccess: true,
      message: "Bill arrival schedule deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting bill arrival schedule:", error)
    return {
      isSuccess: false,
      message: "Failed to delete bill arrival schedule"
    }
  }
}

