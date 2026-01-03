"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesForUserQuery } from "@/queries/properties-queries"
import { db } from "@/db"
import { movingInspectionsTable, leaseAgreementsTable, tenantsTable, propertiesTable } from "@/db/schema"
import { inArray, eq, desc } from "drizzle-orm"
import { MovingInspectionsListClient } from "./moving-inspections-list-client"

export async function MovingInspectionsList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  let propertyIds: string[] = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const props = await getPropertiesByLandlordIdQuery(landlord.id)
      propertyIds = props.map((p) => p.id)
    }
  } else if (userProfile.userType === "rental_agent") {
    const props = await getPropertiesForUserQuery(userProfile.id, userProfile.userType)
    propertyIds = props.map((p) => p.id)
  }

  // Get lease agreements for these properties
  const leaseAgreements = propertyIds.length > 0
    ? await db
        .select()
        .from(leaseAgreementsTable)
        .where(inArray(leaseAgreementsTable.propertyId, propertyIds))
    : []

  const leaseAgreementIds = leaseAgreements.map((l) => l.id)

  // Get inspections for these lease agreements
  const inspections = leaseAgreementIds.length > 0
    ? await db
        .select()
        .from(movingInspectionsTable)
        .where(inArray(movingInspectionsTable.leaseAgreementId, leaseAgreementIds))
        .orderBy(desc(movingInspectionsTable.createdAt))
    : []

  // Batch fetch tenants and properties
  const tenantIds = [...new Set(leaseAgreements.map((l) => l.tenantId))]
  const propertyIdsForFetch = [...new Set(leaseAgreements.map((l) => l.propertyId))]

  const tenants = tenantIds.length > 0
    ? await db.select().from(tenantsTable).where(inArray(tenantsTable.id, tenantIds))
    : []
  const properties = propertyIdsForFetch.length > 0
    ? await db.select().from(propertiesTable).where(inArray(propertiesTable.id, propertyIdsForFetch))
    : []

  const tenantsMap = new Map(tenants.map((t) => [t.id, t]))
  const propertiesMap = new Map(properties.map((p) => [p.id, p]))

  // Map inspections with related data
  const inspectionsWithDetails = inspections
    .map((inspection) => {
      const lease = leaseAgreements.find((l) => l.id === inspection.leaseAgreementId)
      if (!lease) {
        return null
      }

      const tenant = tenantsMap.get(lease.tenantId)
      const property = propertiesMap.get(lease.propertyId)

      if (!tenant || !property) {
        return null
      }

      return {
        ...inspection,
        leaseAgreement: {
          tenant: {
            name: tenant.name
          },
          property: {
            name: property.name
          }
        }
      }
    })
    .filter((inspection): inspection is NonNullable<typeof inspection> => inspection !== null)

  return <MovingInspectionsListClient inspections={inspectionsWithDetails} />
}

