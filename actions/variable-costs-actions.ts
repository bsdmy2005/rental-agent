"use server"

import { db } from "@/db"
import {
  variableCostsTable,
  variableCostAllocationsTable,
  tenantsTable,
  fixedCostsTable,
  type InsertVariableCost,
  type SelectVariableCost,
  type InsertVariableCostAllocation,
  type SelectVariableCostAllocation
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, gte, lte } from "drizzle-orm"

export async function createVariableCostAction(
  variableCost: InsertVariableCost
): Promise<ActionState<SelectVariableCost>> {
  try {
    const [newVariableCost] = await db
      .insert(variableCostsTable)
      .values(variableCost)
      .returning()

    if (!newVariableCost) {
      return { isSuccess: false, message: "Failed to create variable cost" }
    }

    // Automatically allocate to tenants proportionally
    await allocateVariableCostToTenants(newVariableCost.id, variableCost.propertyId)

    return {
      isSuccess: true,
      message: "Variable cost created and allocated successfully",
      data: newVariableCost
    }
  } catch (error) {
    console.error("Error creating variable cost:", error)
    return { isSuccess: false, message: "Failed to create variable cost" }
  }
}

async function allocateVariableCostToTenants(
  variableCostId: string,
  propertyId: string
): Promise<void> {
  // Get all active tenants for the property
  const tenants = await db
    .select({
      id: tenantsTable.id,
      rentalAmount: tenantsTable.rentalAmount
    })
    .from(tenantsTable)
    .where(eq(tenantsTable.propertyId, propertyId))

  if (tenants.length === 0) {
    return
  }

  // Get total rental amount from fixed costs (rent type) for all tenants
  // Fallback to rentalAmount field if no fixed cost rent exists
  let totalRentalAmount = 0
  const tenantRentMap = new Map<string, string>()

  for (const tenant of tenants) {
    // Try to get rent from fixed costs first
    const rentFixedCosts = await db
      .select()
      .from(fixedCostsTable)
      .where(
        and(
          eq(fixedCostsTable.tenantId, tenant.id),
          eq(fixedCostsTable.costType, "rent"),
          eq(fixedCostsTable.isActive, true)
        )
      )
      .limit(1)

    // Use fixed cost rent if available, otherwise fall back to rentalAmount field
    const tenantRent =
      rentFixedCosts[0]?.amount || tenant.rentalAmount || "0"
    tenantRentMap.set(tenant.id, tenantRent)
    totalRentalAmount += parseFloat(tenantRent)
  }

  // Get the variable cost amount
  const variableCost = await db
    .select()
    .from(variableCostsTable)
    .where(eq(variableCostsTable.id, variableCostId))
    .limit(1)

  if (!variableCost[0]) {
    return
  }

  const totalCost = parseFloat(variableCost[0].amount)

  if (totalRentalAmount === 0) {
    // If no rental amounts, split equally
    const amountPerTenant = (totalCost / tenants.length).toString()

    for (const tenant of tenants) {
      await db.insert(variableCostAllocationsTable).values({
        variableCostId,
        tenantId: tenant.id,
        amount: amountPerTenant,
        rentalAmount: "0",
        totalRentalAmount: "0",
        allocationRatio: (1 / tenants.length).toString()
      })
    }
    return
  }

  // Allocate proportionally based on rental amount
  for (const tenant of tenants) {
    const tenantRent = parseFloat(tenantRentMap.get(tenant.id) || "0")
    const allocationRatio = tenantRent / totalRentalAmount
    const allocatedAmount = (totalCost * allocationRatio).toString()

    await db.insert(variableCostAllocationsTable).values({
      variableCostId,
      tenantId: tenant.id,
      amount: allocatedAmount,
      rentalAmount: tenantRentMap.get(tenant.id) || "0",
      totalRentalAmount: totalRentalAmount.toString(),
      allocationRatio: allocationRatio.toString()
    })
  }
}

export async function updateVariableCostAction(
  variableCostId: string,
  data: Partial<InsertVariableCost>
): Promise<ActionState<SelectVariableCost>> {
  try {
    const [updatedVariableCost] = await db
      .update(variableCostsTable)
      .set(data)
      .where(eq(variableCostsTable.id, variableCostId))
      .returning()

    if (!updatedVariableCost) {
      return { isSuccess: false, message: "Variable cost not found" }
    }

    // Re-allocate if amount changed
    if (data.amount) {
      // Delete existing allocations
      await db
        .delete(variableCostAllocationsTable)
        .where(eq(variableCostAllocationsTable.variableCostId, variableCostId))

      // Re-allocate
      await allocateVariableCostToTenants(variableCostId, updatedVariableCost.propertyId)
    }

    return {
      isSuccess: true,
      message: "Variable cost updated successfully",
      data: updatedVariableCost
    }
  } catch (error) {
    console.error("Error updating variable cost:", error)
    return { isSuccess: false, message: "Failed to update variable cost" }
  }
}

export async function deleteVariableCostAction(
  variableCostId: string
): Promise<ActionState<void>> {
  try {
    // Allocations will be deleted via cascade
    await db.delete(variableCostsTable).where(eq(variableCostsTable.id, variableCostId))

    return {
      isSuccess: true,
      message: "Variable cost deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting variable cost:", error)
    return { isSuccess: false, message: "Failed to delete variable cost" }
  }
}

export async function getVariableCostsForPropertyAction(
  propertyId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<ActionState<SelectVariableCost[]>> {
  try {
    const conditions = [eq(variableCostsTable.propertyId, propertyId)]

    if (periodStart) {
      conditions.push(lte(variableCostsTable.periodStart, periodEnd || new Date()))
    }

    if (periodEnd) {
      conditions.push(gte(variableCostsTable.periodEnd, periodStart || new Date(0)))
    }

    const variableCosts = await db
      .select()
      .from(variableCostsTable)
      .where(and(...conditions))
      .orderBy(variableCostsTable.periodStart)

    return {
      isSuccess: true,
      message: "Variable costs retrieved successfully",
      data: variableCosts
    }
  } catch (error) {
    console.error("Error retrieving variable costs:", error)
    return { isSuccess: false, message: "Failed to retrieve variable costs" }
  }
}

export async function getVariableCostAllocationsForTenantAction(
  tenantId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<ActionState<SelectVariableCostAllocation[]>> {
  try {
    const conditions = [
      eq(variableCostAllocationsTable.tenantId, tenantId)
    ]
    if (periodStart) {
      conditions.push(lte(variableCostsTable.periodStart, periodEnd || new Date()))
    }
    if (periodEnd) {
      conditions.push(gte(variableCostsTable.periodEnd, periodStart || new Date(0)))
    }

    const allocations = await db
      .select({
        allocation: variableCostAllocationsTable,
        variableCost: variableCostsTable
      })
      .from(variableCostAllocationsTable)
      .innerJoin(
        variableCostsTable,
        eq(variableCostAllocationsTable.variableCostId, variableCostsTable.id)
      )
      .where(and(...conditions))

    return {
      isSuccess: true,
      message: "Variable cost allocations retrieved successfully",
      data: allocations.map((a) => a.allocation)
    }
  } catch (error) {
    console.error("Error retrieving variable cost allocations:", error)
    return { isSuccess: false, message: "Failed to retrieve variable cost allocations" }
  }
}

