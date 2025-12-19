import { db } from "@/db"
import { tenantsTable, propertiesTable, type SelectTenant } from "@/db/schema"
import { eq, inArray } from "drizzle-orm"

export async function getTenantByIdQuery(tenantId: string): Promise<SelectTenant | null> {
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId))
    .limit(1)

  return tenant || null
}

export async function getTenantsByPropertyIdQuery(propertyId: string): Promise<SelectTenant[]> {
  const tenants = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.propertyId, propertyId))

  return tenants
}

export async function getTenantByUserProfileIdQuery(
  userProfileId: string
): Promise<SelectTenant | null> {
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.userProfileId, userProfileId))
    .limit(1)

  return tenant || null
}

export interface TenantWithProperty extends SelectTenant {
  property: {
    id: string
    name: string
  }
}

export async function getTenantsWithPropertyQuery(tenantIds: string[]): Promise<TenantWithProperty[]> {
  if (tenantIds.length === 0) {
    return []
  }

  const result = await db
    .select({
      id: tenantsTable.id,
      propertyId: tenantsTable.propertyId,
      userProfileId: tenantsTable.userProfileId,
      name: tenantsTable.name,
      idNumber: tenantsTable.idNumber,
      email: tenantsTable.email,
      phone: tenantsTable.phone,
      rentalAmount: tenantsTable.rentalAmount,
      leaseStartDate: tenantsTable.leaseStartDate,
      leaseEndDate: tenantsTable.leaseEndDate,
      createdAt: tenantsTable.createdAt,
      updatedAt: tenantsTable.updatedAt,
      property: {
        id: propertiesTable.id,
        name: propertiesTable.name
      }
    })
    .from(tenantsTable)
    .innerJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
    .where(inArray(tenantsTable.id, tenantIds))

  return result.map(({ property, ...tenant }) => ({
    ...tenant,
    property
  }))
}

