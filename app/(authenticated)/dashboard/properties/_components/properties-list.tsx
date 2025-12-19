"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesWithTenantsByLandlordIdQuery, getPropertiesWithTenantsByRentalAgentIdQuery, type PropertyWithDetails } from "@/queries/properties-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getScheduleStatusForPropertyAction } from "@/actions/billing-schedule-status-actions"
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

  // Get late schedule counts for each property
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const propertiesWithLateCounts = await Promise.all(
    properties.map(async (property) => {
      const statusesResult = await getScheduleStatusForPropertyAction(
        property.id,
        currentYear,
        currentMonth
      )
      const statuses = statusesResult.isSuccess ? statusesResult.data : []
      const lateCount = statuses.filter(
        (s) => s.status === "late" || s.status === "missed"
      ).length

      return {
        ...property,
        lateScheduleCount: lateCount
      }
    })
  )

  return <PropertiesListClient properties={propertiesWithLateCounts} />
}

