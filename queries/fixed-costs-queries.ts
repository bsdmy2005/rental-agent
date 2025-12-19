import { db } from "@/db"
import { fixedCostsTable, tenantsTable, type SelectFixedCost } from "@/db/schema"
import { eq, and, gte, lte, or, isNull } from "drizzle-orm"

export async function getFixedCostByIdQuery(
  fixedCostId: string
): Promise<SelectFixedCost | null> {
  const [fixedCost] = await db
    .select()
    .from(fixedCostsTable)
    .where(eq(fixedCostsTable.id, fixedCostId))
    .limit(1)

  return fixedCost || null
}

export async function getFixedCostsByTenantIdQuery(
  tenantId: string
): Promise<SelectFixedCost[]> {
  const fixedCosts = await db
    .select()
    .from(fixedCostsTable)
    .where(eq(fixedCostsTable.tenantId, tenantId))
    .orderBy(fixedCostsTable.createdAt)

  return fixedCosts
}

export async function getActiveFixedCostsByTenantIdQuery(
  tenantId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<SelectFixedCost[]> {
  const conditions = [
    eq(fixedCostsTable.tenantId, tenantId),
    eq(fixedCostsTable.isActive, true)
  ]

  // If period provided, check if fixed cost is active during that period
  if (periodStart) {
    conditions.push(
      or(
        isNull(fixedCostsTable.endDate),
        gte(fixedCostsTable.endDate, periodStart)
      )
    )
  }

  if (periodEnd) {
    conditions.push(lte(fixedCostsTable.startDate, periodEnd))
  }

  const fixedCosts = await db
    .select()
    .from(fixedCostsTable)
    .where(and(...conditions))
    .orderBy(fixedCostsTable.startDate)

  return fixedCosts
}

export async function getFixedCostsByPropertyIdQuery(
  propertyId: string
): Promise<SelectFixedCost[]> {
  // Get all fixed costs for tenants on this property
  const fixedCosts = await db
    .select({
      id: fixedCostsTable.id,
      tenantId: fixedCostsTable.tenantId,
      costType: fixedCostsTable.costType,
      amount: fixedCostsTable.amount,
      description: fixedCostsTable.description,
      isActive: fixedCostsTable.isActive,
      startDate: fixedCostsTable.startDate,
      endDate: fixedCostsTable.endDate,
      createdAt: fixedCostsTable.createdAt,
      updatedAt: fixedCostsTable.updatedAt
    })
    .from(fixedCostsTable)
    .innerJoin(tenantsTable, eq(fixedCostsTable.tenantId, tenantsTable.id))
    .where(eq(tenantsTable.propertyId, propertyId))
    .orderBy(fixedCostsTable.createdAt)

  return fixedCosts as SelectFixedCost[]
}

