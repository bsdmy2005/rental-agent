"use server"

import { db } from "@/db"
import {
  rentalInvoiceInstancesTable,
  type InsertRentalInvoiceInstance,
  type SelectRentalInvoiceInstance
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

export async function createRentalInvoiceInstanceAction(
  invoiceInstance: InsertRentalInvoiceInstance
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    const [newInstance] = await db
      .insert(rentalInvoiceInstancesTable)
      .values(invoiceInstance)
      .returning()

    return {
      isSuccess: true,
      message: "Rental invoice instance created successfully",
      data: newInstance
    }
  } catch (error) {
    console.error("Error creating rental invoice instance:", error)
    return {
      isSuccess: false,
      message: "Failed to create rental invoice instance"
    }
  }
}

export async function getRentalInvoiceInstancesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectRentalInvoiceInstance[]>> {
  try {
    const instances = await db.query.rentalInvoiceInstances.findMany({
      where: eq(rentalInvoiceInstancesTable.propertyId, propertyId),
      orderBy: (instances, { desc, asc }) => [
        desc(instances.periodYear),
        desc(instances.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Rental invoice instances retrieved successfully",
      data: instances
    }
  } catch (error) {
    console.error("Error getting rental invoice instances:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice instances"
    }
  }
}

export async function getRentalInvoiceInstancesByTenantIdAction(
  tenantId: string
): Promise<ActionState<SelectRentalInvoiceInstance[]>> {
  try {
    const instances = await db.query.rentalInvoiceInstances.findMany({
      where: eq(rentalInvoiceInstancesTable.tenantId, tenantId),
      orderBy: (instances, { desc, asc }) => [
        desc(instances.periodYear),
        desc(instances.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Rental invoice instances retrieved successfully",
      data: instances
    }
  } catch (error) {
    console.error("Error getting rental invoice instances:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice instances"
    }
  }
}

export async function getRentalInvoiceInstancesByTemplateIdAction(
  templateId: string
): Promise<ActionState<SelectRentalInvoiceInstance[]>> {
  try {
    const instances = await db.query.rentalInvoiceInstances.findMany({
      where: eq(rentalInvoiceInstancesTable.rentalInvoiceTemplateId, templateId),
      orderBy: (instances, { desc, asc }) => [
        desc(instances.periodYear),
        desc(instances.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Rental invoice instances retrieved successfully",
      data: instances
    }
  } catch (error) {
    console.error("Error getting rental invoice instances:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice instances"
    }
  }
}

export async function getRentalInvoiceInstanceByIdAction(
  instanceId: string
): Promise<ActionState<SelectRentalInvoiceInstance | null>> {
  try {
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: eq(rentalInvoiceInstancesTable.id, instanceId)
    })

    return {
      isSuccess: true,
      message: "Rental invoice instance retrieved successfully",
      data: instance || null
    }
  } catch (error) {
    console.error("Error getting rental invoice instance:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice instance"
    }
  }
}

export async function updateRentalInvoiceInstanceAction(
  instanceId: string,
  data: Partial<InsertRentalInvoiceInstance>
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    const [updatedInstance] = await db
      .update(rentalInvoiceInstancesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rentalInvoiceInstancesTable.id, instanceId))
      .returning()

    if (!updatedInstance) {
      return { isSuccess: false, message: "Rental invoice instance not found" }
    }

    return {
      isSuccess: true,
      message: "Rental invoice instance updated successfully",
      data: updatedInstance
    }
  } catch (error) {
    console.error("Error updating rental invoice instance:", error)
    return {
      isSuccess: false,
      message: "Failed to update rental invoice instance"
    }
  }
}

export async function deleteRentalInvoiceInstanceAction(
  instanceId: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(rentalInvoiceInstancesTable)
      .where(eq(rentalInvoiceInstancesTable.id, instanceId))

    return {
      isSuccess: true,
      message: "Rental invoice instance deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting rental invoice instance:", error)
    return {
      isSuccess: false,
      message: "Failed to delete rental invoice instance"
    }
  }
}

export async function findRentalInvoiceInstanceByTemplateAndPeriodAction(
  templateId: string,
  periodYear: number,
  periodMonth: number
): Promise<ActionState<SelectRentalInvoiceInstance | null>> {
  try {
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: and(
        eq(rentalInvoiceInstancesTable.rentalInvoiceTemplateId, templateId),
        eq(rentalInvoiceInstancesTable.periodYear, periodYear),
        eq(rentalInvoiceInstancesTable.periodMonth, periodMonth)
      )
    })

    return {
      isSuccess: true,
      message: "Rental invoice instance found",
      data: instance || null
    }
  } catch (error) {
    console.error("Error finding rental invoice instance:", error)
    return {
      isSuccess: false,
      message: "Failed to find rental invoice instance"
    }
  }
}

