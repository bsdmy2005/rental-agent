import { db } from "@/db"
import { leaseAgreementsTable, type SelectLeaseAgreement } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getLeaseAgreementByIdQuery(
  leaseAgreementId: string
): Promise<SelectLeaseAgreement | null> {
  const [lease] = await db
    .select()
    .from(leaseAgreementsTable)
    .where(eq(leaseAgreementsTable.id, leaseAgreementId))
    .limit(1)

  return lease || null
}

export async function getLeaseAgreementByTenantIdQuery(
  tenantId: string
): Promise<SelectLeaseAgreement | null> {
  const [lease] = await db
    .select()
    .from(leaseAgreementsTable)
    .where(eq(leaseAgreementsTable.tenantId, tenantId))
    .limit(1)

  return lease || null
}

export async function getLeaseAgreementsByPropertyIdQuery(
  propertyId: string
): Promise<SelectLeaseAgreement[]> {
  const leases = await db
    .select()
    .from(leaseAgreementsTable)
    .where(eq(leaseAgreementsTable.propertyId, propertyId))

  return leases
}

