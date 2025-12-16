"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery } from "@/queries/properties-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getPropertiesByRentalAgentIdQuery } from "@/queries/properties-queries"

export async function PropertiesList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  let properties = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      properties = await getPropertiesByLandlordIdQuery(landlord.id)
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      properties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
    }
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No properties found.</p>
        <p className="text-muted-foreground text-sm">Create your first property to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => (
        <div key={property.id} className="rounded-lg border p-4">
          <h3 className="font-semibold">{property.name}</h3>
          <p className="text-muted-foreground text-sm">{property.address}</p>
          {property.rentalAmount && (
            <p className="mt-2 font-medium">
              R{property.rentalAmount}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

