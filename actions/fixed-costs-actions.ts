"use server"

import { db } from "@/db"
import { fixedCostsTable, type InsertFixedCost, type SelectFixedCost } from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, gte, lte, or, isNull } from "drizzle-orm"

export async function createFixedCostAction(
  fixedCost: InsertFixedCost
): Promise<ActionState<SelectFixedCost>> {
  try {
    const [newFixedCost] = await db.insert(fixedCostsTable).values(fixedCost).returning()

    if (!newFixedCost) {
      return { isSuccess: false, message: "Failed to create fixed cost" }
    }

    return {
      isSuccess: true,
      message: "Fixed cost created successfully",
      data: newFixedCost
    }
  } catch (error) {
    console.error("Error creating fixed cost:", error)
    return { isSuccess: false, message: "Failed to create fixed cost" }
  }
}

export async function updateFixedCostAction(
  fixedCostId: string,
  data: Partial<InsertFixedCost>
): Promise<ActionState<SelectFixedCost>> {
  try {
    const [updatedFixedCost] = await db
      .update(fixedCostsTable)
      .set(data)
      .where(eq(fixedCostsTable.id, fixedCostId))
      .returning()

    if (!updatedFixedCost) {
      return { isSuccess: false, message: "Fixed cost not found" }
    }

    return {
      isSuccess: true,
      message: "Fixed cost updated successfully",
      data: updatedFixedCost
    }
  } catch (error) {
    console.error("Error updating fixed cost:", error)
    return { isSuccess: false, message: "Failed to update fixed cost" }
  }
}

export async function deleteFixedCostAction(
  fixedCostId: string
): Promise<ActionState<void>> {
  try {
    await db.delete(fixedCostsTable).where(eq(fixedCostsTable.id, fixedCostId))

    return {
      isSuccess: true,
      message: "Fixed cost deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting fixed cost:", error)
    return { isSuccess: false, message: "Failed to delete fixed cost" }
  }
}

export async function getActiveFixedCostsForTenantAction(
  tenantId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<ActionState<SelectFixedCost[]>> {
  try {
    const conditions = [
      eq(fixedCostsTable.tenantId, tenantId),
      eq(fixedCostsTable.isActive, true)
    ]

    // If period provided, check if fixed cost is active during that period
    if (periodStart) {
      const periodCondition = or(
        isNull(fixedCostsTable.endDate),
        gte(fixedCostsTable.endDate, periodStart)
      )
      if (periodCondition) {
        conditions.push(periodCondition)
      }
    }

    if (periodEnd) {
      conditions.push(lte(fixedCostsTable.startDate, periodEnd))
    }

    const fixedCosts = await db
      .select()
      .from(fixedCostsTable)
      .where(and(...conditions))

    return {
      isSuccess: true,
      message: "Fixed costs retrieved successfully",
      data: fixedCosts
    }
  } catch (error) {
    console.error("Error retrieving fixed costs:", error)
    return { isSuccess: false, message: "Failed to retrieve fixed costs" }
  }
}

