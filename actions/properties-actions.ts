"use server"

import { db } from "@/db"
import { propertiesTable, type InsertProperty, type SelectProperty } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createPropertyAction(
  property: InsertProperty
): Promise<ActionState<SelectProperty>> {
  try {
    const [newProperty] = await db.insert(propertiesTable).values(property).returning()

    if (!newProperty) {
      return { isSuccess: false, message: "Failed to create property" }
    }

    return {
      isSuccess: true,
      message: "Property created successfully",
      data: newProperty
    }
  } catch (error) {
    console.error("Error creating property:", error)
    return { isSuccess: false, message: "Failed to create property" }
  }
}

export async function updatePropertyAction(
  propertyId: string,
  data: Partial<InsertProperty>
): Promise<ActionState<SelectProperty>> {
  try {
    const [updatedProperty] = await db
      .update(propertiesTable)
      .set(data)
      .where(eq(propertiesTable.id, propertyId))
      .returning()

    if (!updatedProperty) {
      return { isSuccess: false, message: "Property not found" }
    }

    return {
      isSuccess: true,
      message: "Property updated successfully",
      data: updatedProperty
    }
  } catch (error) {
    console.error("Error updating property:", error)
    return { isSuccess: false, message: "Failed to update property" }
  }
}

export async function deletePropertyAction(propertyId: string): Promise<ActionState<void>> {
  try {
    await db.delete(propertiesTable).where(eq(propertiesTable.id, propertyId))

    return {
      isSuccess: true,
      message: "Property deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting property:", error)
    return { isSuccess: false, message: "Failed to delete property" }
  }
}

