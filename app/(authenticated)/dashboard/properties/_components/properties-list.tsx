"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesWithTenantsByLandlordIdQuery, getPropertiesWithTenantsByRentalAgentIdQuery, type PropertyWithDetails } from "@/queries/properties-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { PropertiesListClient } from "./properties-list-client"

export async function PropertiesList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  let properties: PropertyWithDetails[] = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      properties = await getPropertiesWithTenantsByLandlordIdQuery(landlord.id)
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      properties = await getPropertiesWithTenantsByRentalAgentIdQuery(rentalAgent.id)
    }
  }

  return <PropertiesListClient properties={properties} />
}

