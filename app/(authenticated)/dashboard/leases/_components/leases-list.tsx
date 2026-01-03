"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesForUserQuery } from "@/queries/properties-queries"
import { db } from "@/db"
import { leaseAgreementsTable, tenantsTable, propertiesTable } from "@/db/schema"
import { inArray, eq, desc, and, or, isNotNull } from "drizzle-orm"
import { LeasesListClient } from "./leases-list-client"

export async function LeasesList() {
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

  // Get all leases for these properties
  const leases = propertyIds.length > 0
    ? await db
        .select()
        .from(leaseAgreementsTable)
        .where(inArray(leaseAgreementsTable.propertyId, propertyIds))
        .orderBy(desc(leaseAgreementsTable.createdAt))
    : []

  // Batch fetch tenants and properties
  const tenantIds = [...new Set(leases.map((l) => l.tenantId))]
  const propertyIdsForFetch = [...new Set(leases.map((l) => l.propertyId))]

  const tenants = tenantIds.length > 0
    ? await db.select().from(tenantsTable).where(inArray(tenantsTable.id, tenantIds))
    : []
  const properties = propertyIdsForFetch.length > 0
    ? await db.select().from(propertiesTable).where(inArray(propertiesTable.id, propertyIdsForFetch))
    : []

  const tenantsMap = new Map(tenants.map((t) => [t.id, t]))
  const propertiesMap = new Map(properties.map((p) => [p.id, p]))

  // Map leases with related data
  const leasesWithDetails = leases.map((lease) => {
    const tenant = tenantsMap.get(lease.tenantId)
    const property = propertiesMap.get(lease.propertyId)

    return {
      ...lease,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email
          }
        : null,
      property: property
        ? {
            id: property.id,
            name: property.name,
            streetAddress: property.streetAddress,
            suburb: property.suburb,
            province: property.province
          }
        : null
    }
  })

  return <LeasesListClient leases={leasesWithDetails} />
}

