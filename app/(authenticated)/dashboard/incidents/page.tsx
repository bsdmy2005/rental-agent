"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesByRentalAgentIdQuery } from "@/queries/properties-queries"
import { getIncidentsByPropertyIdsQuery } from "@/queries/incidents-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AllIncidentsList } from "./_components/all-incidents-list"

export default async function AllIncidentsPage() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  // Get user's properties
  let propertyIds: string[] = []
  let properties: Array<{ id: string; name: string }> = []
  
  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const props = await getPropertiesByLandlordIdQuery(landlord.id)
      propertyIds = props.map((p) => p.id)
      properties = props.map((p) => ({ id: p.id, name: p.name }))
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const props = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      propertyIds = props.map((p) => p.id)
      properties = props.map((p) => ({ id: p.id, name: p.name }))
    }
  }

  // Get all incidents for user's properties
  const incidents = propertyIds.length > 0 
    ? await getIncidentsByPropertyIdsQuery(propertyIds)
    : []

  // Create property name map
  const propertyNamesMap = properties.reduce((acc, prop) => {
    acc[prop.id] = prop.name
    return acc
  }, {} as Record<string, string>)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Incidents</h1>
        <p className="text-muted-foreground">Manage incidents across all your properties</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incidents by Property</CardTitle>
          <CardDescription>
            {incidents.length > 0 
              ? `Viewing ${incidents.length} incident${incidents.length !== 1 ? "s" : ""} across ${new Set(incidents.map(i => i.propertyId)).size} propert${new Set(incidents.map(i => i.propertyId)).size !== 1 ? "ies" : "y"}`
              : "No incidents found. Incidents will appear here when tenants report issues."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length > 0 ? (
            <AllIncidentsList incidents={incidents} propertyNames={propertyNamesMap} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {propertyIds.length === 0 
                ? "No properties found. Add properties to start managing incidents."
                : "No incidents reported yet. Incidents will appear here when tenants report issues."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

