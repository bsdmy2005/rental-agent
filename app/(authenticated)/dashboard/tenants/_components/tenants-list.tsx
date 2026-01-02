"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesForUserQuery } from "@/queries/properties-queries"
import { getTenantsByPropertyIdQuery, getTenantsWithPropertyQuery, type TenantWithProperty } from "@/queries/tenants-queries"
import { TenantsListClient } from "./tenants-list-client"

export async function TenantsList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const allTenantIds: string[] = []
  const propertyMap = new Map<string, { id: string; name: string }>()

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const properties = await getPropertiesByLandlordIdQuery(landlord.id)
      for (const property of properties) {
        propertyMap.set(property.id, { id: property.id, name: property.name })
        const tenants = await getTenantsByPropertyIdQuery(property.id)
        allTenantIds.push(...tenants.map((t) => t.id))
      }
    }
  } else if (userProfile.userType === "rental_agent") {
    const properties = await getPropertiesForUserQuery(userProfile.id, userProfile.userType)
    for (const property of properties) {
      propertyMap.set(property.id, { id: property.id, name: property.name })
      const tenants = await getTenantsByPropertyIdQuery(property.id)
      allTenantIds.push(...tenants.map((t) => t.id))
    }
  }

  const tenantsWithProperty = await getTenantsWithPropertyQuery(allTenantIds)

  return <TenantsListClient tenants={tenantsWithProperty} />
}
