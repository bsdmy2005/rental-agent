import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import {
  getPropertiesByLandlordIdQuery,
  getPropertiesForUserQuery
} from "@/queries/properties-queries"
import { getPayableInstancesWithDetailsQuery } from "@/queries/payable-instances-queries"
import { PaymentsListClient } from "./payments-list-client"

export async function PaymentsList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  let properties: Array<{ id: string; name: string }> = []
  let propertyIds: string[] = []
  let allPayables: any[] = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
      propertyIds = landlordProperties.map((p) => p.id)
    }
  } else if (userProfile.userType === "rental_agent") {
    const agentProperties = await getPropertiesForUserQuery(userProfile.id, userProfile.userType)
    properties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
    propertyIds = agentProperties.map((p) => p.id)
  }

  // Fetch all payable instances with details
  if (propertyIds.length > 0) {
    allPayables = await getPayableInstancesWithDetailsQuery(propertyIds)
  }

  return <PaymentsListClient payables={allPayables} properties={properties} />
}

