"use server"

import { db } from "@/db"
import {
  rentalAgentsTable,
  type InsertRentalAgent,
  type SelectRentalAgent
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createRentalAgentAction(
  userProfileId: string,
  agentData: Omit<InsertRentalAgent, "userProfileId">
): Promise<ActionState<SelectRentalAgent>> {
  try {
    const [newRentalAgent] = await db
      .insert(rentalAgentsTable)
      .values({
        ...agentData,
        userProfileId
      })
      .returning()

    if (!newRentalAgent) {
      return { isSuccess: false, message: "Failed to create rental agent" }
    }

    return {
      isSuccess: true,
      message: "Rental agent created successfully",
      data: newRentalAgent
    }
  } catch (error) {
    console.error("Error creating rental agent:", error)
    return { isSuccess: false, message: "Failed to create rental agent" }
  }
}

export async function updateRentalAgentAction(
  rentalAgentId: string,
  data: Partial<InsertRentalAgent>
): Promise<ActionState<SelectRentalAgent>> {
  try {
    const [updatedRentalAgent] = await db
      .update(rentalAgentsTable)
      .set(data)
      .where(eq(rentalAgentsTable.id, rentalAgentId))
      .returning()

    if (!updatedRentalAgent) {
      return { isSuccess: false, message: "Rental agent not found" }
    }

    return {
      isSuccess: true,
      message: "Rental agent updated successfully",
      data: updatedRentalAgent
    }
  } catch (error) {
    console.error("Error updating rental agent:", error)
    return { isSuccess: false, message: "Failed to update rental agent" }
  }
}

