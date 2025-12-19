import { db } from "@/db"
import {
  variableCostsTable,
  variableCostAllocationsTable,
  tenantsTable,
  type SelectVariableCost,
  type SelectVariableCostAllocation
} from "@/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"

export async function getVariableCostByIdQuery(
  variableCostId: string
): Promise<SelectVariableCost | null> {
  const [variableCost] = await db
    .select()
    .from(variableCostsTable)
    .where(eq(variableCostsTable.id, variableCostId))
    .limit(1)

  return variableCost || null
}

export async function getVariableCostsByPropertyIdQuery(
  propertyId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<SelectVariableCost[]> {
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

  return variableCosts
}

export async function getVariableCostAllocationsByVariableCostIdQuery(
  variableCostId: string
): Promise<SelectVariableCostAllocation[]> {
  const allocations = await db
    .select()
    .from(variableCostAllocationsTable)
    .where(eq(variableCostAllocationsTable.variableCostId, variableCostId))

  return allocations
}

export async function getVariableCostAllocationsByTenantIdQuery(
  tenantId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<Array<SelectVariableCostAllocation & { variableCost: SelectVariableCost }>> {
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
    .where(
      and(
        eq(variableCostAllocationsTable.tenantId, tenantId),
        periodStart
          ? lte(variableCostsTable.periodStart, periodEnd || new Date())
          : undefined,
        periodEnd ? gte(variableCostsTable.periodEnd, periodStart || new Date(0)) : undefined
      )
    )

  return allocations.map((a) => ({
    ...a.allocation,
    variableCost: a.variableCost
  })) as Array<SelectVariableCostAllocation & { variableCost: SelectVariableCost }>
}

export async function getVariableCostsByBillIdQuery(
  billId: string
): Promise<SelectVariableCost[]> {
  const variableCosts = await db
    .select()
    .from(variableCostsTable)
    .where(eq(variableCostsTable.billId, billId))

  return variableCosts
}

