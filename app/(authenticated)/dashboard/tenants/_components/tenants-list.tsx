"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesByRentalAgentIdQuery } from "@/queries/properties-queries"
import { getTenantsByPropertyIdQuery } from "@/queries/tenants-queries"

export async function TenantsList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  let allTenants = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const properties = await getPropertiesByLandlordIdQuery(landlord.id)
      for (const property of properties) {
        const tenants = await getTenantsByPropertyIdQuery(property.id)
        allTenants.push(...tenants)
      }
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const properties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      for (const property of properties) {
        const tenants = await getTenantsByPropertyIdQuery(property.id)
        allTenants.push(...tenants)
      }
    }
  }

  if (allTenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No tenants found.</p>
        <p className="text-muted-foreground text-sm">Add tenants to your properties to get started.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <div className="divide-y">
        {allTenants.map((tenant) => (
          <div key={tenant.id} className="p-4">
            <h3 className="font-semibold">{tenant.name}</h3>
            {tenant.email && <p className="text-muted-foreground text-sm">{tenant.email}</p>}
            {tenant.phone && <p className="text-muted-foreground text-sm">{tenant.phone}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
