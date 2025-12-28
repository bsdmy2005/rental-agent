"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesByRentalAgentIdQuery } from "@/queries/properties-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NewRfqForm } from "./_components/new-rfq-form"

export default async function NewRfqPage() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  // Only landlords and rental agents can access this
  if (userProfile.userType !== "landlord" && userProfile.userType !== "rental_agent") {
    return <div>Unauthorized</div>
  }

  // Get user's properties
  let properties: Array<{ id: string; name: string; suburb: string; province: string }> = []
  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({
        id: p.id,
        name: p.name,
        suburb: p.suburb,
        province: p.province
      }))
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const agentProperties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      properties = agentProperties.map((p) => ({
        id: p.id,
        name: p.name,
        suburb: p.suburb,
        province: p.province
      }))
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Create New RFQ</CardTitle>
          <CardDescription>Create a standalone quote request for property improvements or maintenance</CardDescription>
        </CardHeader>
        <CardContent>
          <NewRfqForm properties={properties} requestedBy={userProfile.id} />
        </CardContent>
      </Card>
    </div>
  )
}

