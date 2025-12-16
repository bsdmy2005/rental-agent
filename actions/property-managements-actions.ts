"use server"

import { db } from "@/db"
import {
  propertyManagementsTable,
  type InsertPropertyManagement,
  type SelectPropertyManagement
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

export async function assignRentalAgentToPropertyAction(
  propertyId: string,
  rentalAgentId: string,
  managementData: Partial<InsertPropertyManagement>
): Promise<ActionState<SelectPropertyManagement>> {
  try {
    const [newManagement] = await db
      .insert(propertyManagementsTable)
      .values({
        propertyId,
        rentalAgentId,
        ...managementData
      })
      .returning()

    if (!newManagement) {
      return { isSuccess: false, message: "Failed to assign rental agent to property" }
    }

    return {
      isSuccess: true,
      message: "Rental agent assigned to property successfully",
      data: newManagement
    }
  } catch (error) {
    console.error("Error assigning rental agent to property:", error)
    return { isSuccess: false, message: "Failed to assign rental agent to property" }
  }
}

export async function updatePropertyManagementAction(
  managementId: string,
  data: Partial<InsertPropertyManagement>
): Promise<ActionState<SelectPropertyManagement>> {
  try {
    const [updatedManagement] = await db
      .update(propertyManagementsTable)
      .set(data)
      .where(eq(propertyManagementsTable.id, managementId))
      .returning()

    if (!updatedManagement) {
      return { isSuccess: false, message: "Property management not found" }
    }

    return {
      isSuccess: true,
      message: "Property management updated successfully",
      data: updatedManagement
    }
  } catch (error) {
    console.error("Error updating property management:", error)
    return { isSuccess: false, message: "Failed to update property management" }
  }
}

export async function removeRentalAgentFromPropertyAction(
  propertyId: string,
  rentalAgentId: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(propertyManagementsTable)
      .where(
        and(
          eq(propertyManagementsTable.propertyId, propertyId),
          eq(propertyManagementsTable.rentalAgentId, rentalAgentId)
        )
      )

    return {
      isSuccess: true,
      message: "Rental agent removed from property successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error removing rental agent from property:", error)
    return { isSuccess: false, message: "Failed to remove rental agent from property" }
  }
}

export async function deactivatePropertyManagementAction(
  managementId: string
): Promise<ActionState<SelectPropertyManagement>> {
  try {
    const [updatedManagement] = await db
      .update(propertyManagementsTable)
      .set({ isActive: false })
      .where(eq(propertyManagementsTable.id, managementId))
      .returning()

    if (!updatedManagement) {
      return { isSuccess: false, message: "Property management not found" }
    }

    return {
      isSuccess: true,
      message: "Property management deactivated successfully",
      data: updatedManagement
    }
  } catch (error) {
    console.error("Error deactivating property management:", error)
    return { isSuccess: false, message: "Failed to deactivate property management" }
  }
}

