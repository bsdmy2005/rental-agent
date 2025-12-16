"use server"

import { db } from "@/db"
import { landlordsTable, type InsertLandlord, type SelectLandlord } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createLandlordAction(
  userProfileId: string,
  landlordData: InsertLandlord
): Promise<ActionState<SelectLandlord>> {
  try {
    const [newLandlord] = await db
      .insert(landlordsTable)
      .values({
        ...landlordData,
        userProfileId
      })
      .returning()

    if (!newLandlord) {
      return { isSuccess: false, message: "Failed to create landlord" }
    }

    return {
      isSuccess: true,
      message: "Landlord created successfully",
      data: newLandlord
    }
  } catch (error) {
    console.error("Error creating landlord:", error)
    return { isSuccess: false, message: "Failed to create landlord" }
  }
}

export async function updateLandlordAction(
  landlordId: string,
  data: Partial<InsertLandlord>
): Promise<ActionState<SelectLandlord>> {
  try {
    const [updatedLandlord] = await db
      .update(landlordsTable)
      .set(data)
      .where(eq(landlordsTable.id, landlordId))
      .returning()

    if (!updatedLandlord) {
      return { isSuccess: false, message: "Landlord not found" }
    }

    return {
      isSuccess: true,
      message: "Landlord updated successfully",
      data: updatedLandlord
    }
  } catch (error) {
    console.error("Error updating landlord:", error)
    return { isSuccess: false, message: "Failed to update landlord" }
  }
}

