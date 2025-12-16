import { db } from "@/db"
import { tenantsTable, type SelectTenant } from "@/db/schema"
import { eq } from "drizzle-orm"

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

