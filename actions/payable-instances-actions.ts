"use server"

import { db } from "@/db"
import {
  payableInstancesTable,
  type InsertPayableInstance,
  type SelectPayableInstance
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

export async function createPayableInstanceAction(
  payableInstance: InsertPayableInstance
): Promise<ActionState<SelectPayableInstance>> {
  try {
    const [newInstance] = await db
      .insert(payableInstancesTable)
      .values(payableInstance)
      .returning()

    return {
      isSuccess: true,
      message: "Payable instance created successfully",
      data: newInstance
    }
  } catch (error) {
    console.error("Error creating payable instance:", error)
    return { isSuccess: false, message: "Failed to create payable instance" }
  }
}

export async function getPayableInstancesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectPayableInstance[]>> {
  try {
    const instances = await db.query.payableInstances.findMany({
      where: eq(payableInstancesTable.propertyId, propertyId),
      orderBy: (instances, { desc, asc }) => [
        desc(instances.periodYear),
        desc(instances.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Payable instances retrieved successfully",
      data: instances
    }
  } catch (error) {
    console.error("Error getting payable instances:", error)
    return { isSuccess: false, message: "Failed to get payable instances" }
  }
}

export async function getPayableInstancesByTemplateIdAction(
  templateId: string
): Promise<ActionState<SelectPayableInstance[]>> {
  try {
    const instances = await db.query.payableInstances.findMany({
      where: eq(payableInstancesTable.payableTemplateId, templateId),
      orderBy: (instances, { desc, asc }) => [
        desc(instances.periodYear),
        desc(instances.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Payable instances retrieved successfully",
      data: instances
    }
  } catch (error) {
    console.error("Error getting payable instances:", error)
    return { isSuccess: false, message: "Failed to get payable instances" }
  }
}

export async function getPayableInstanceByIdAction(
  instanceId: string
): Promise<ActionState<SelectPayableInstance | null>> {
  try {
    const instance = await db.query.payableInstances.findFirst({
      where: eq(payableInstancesTable.id, instanceId)
    })

    return {
      isSuccess: true,
      message: "Payable instance retrieved successfully",
      data: instance || null
    }
  } catch (error) {
    console.error("Error getting payable instance:", error)
    return { isSuccess: false, message: "Failed to get payable instance" }
  }
}

export async function updatePayableInstanceAction(
  instanceId: string,
  data: Partial<InsertPayableInstance>
): Promise<ActionState<SelectPayableInstance>> {
  try {
    const [updatedInstance] = await db
      .update(payableInstancesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payableInstancesTable.id, instanceId))
      .returning()

    if (!updatedInstance) {
      return { isSuccess: false, message: "Payable instance not found" }
    }

    return {
      isSuccess: true,
      message: "Payable instance updated successfully",
      data: updatedInstance
    }
  } catch (error) {
    console.error("Error updating payable instance:", error)
    return { isSuccess: false, message: "Failed to update payable instance" }
  }
}

export async function deletePayableInstanceAction(
  instanceId: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(payableInstancesTable)
      .where(eq(payableInstancesTable.id, instanceId))

    return {
      isSuccess: true,
      message: "Payable instance deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting payable instance:", error)
    return { isSuccess: false, message: "Failed to delete payable instance" }
  }
}

export async function findPayableInstanceByTemplateAndPeriodAction(
  templateId: string,
  periodYear: number,
  periodMonth: number
): Promise<ActionState<SelectPayableInstance | null>> {
  try {
    const instance = await db.query.payableInstances.findFirst({
      where: and(
        eq(payableInstancesTable.payableTemplateId, templateId),
        eq(payableInstancesTable.periodYear, periodYear),
        eq(payableInstancesTable.periodMonth, periodMonth)
      )
    })

    return {
      isSuccess: true,
      message: "Payable instance found",
      data: instance || null
    }
  } catch (error) {
    console.error("Error finding payable instance:", error)
    return { isSuccess: false, message: "Failed to find payable instance" }
  }
}

