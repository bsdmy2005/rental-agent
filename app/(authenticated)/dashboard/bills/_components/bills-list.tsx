"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesByRentalAgentIdQuery } from "@/queries/properties-queries"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"

export async function BillsList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  let allBills = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const properties = await getPropertiesByLandlordIdQuery(landlord.id)
      for (const property of properties) {
        const bills = await getBillsByPropertyIdQuery(property.id)
        allBills.push(...bills)
      }
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const properties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      for (const property of properties) {
        const bills = await getBillsByPropertyIdQuery(property.id)
        allBills.push(...bills)
      }
    }
  }

  if (allBills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No bills found.</p>
        <p className="text-muted-foreground text-sm">
          Bills will appear here when you upload them or receive them via email.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <div className="divide-y">
        {allBills.map((bill) => (
          <div key={bill.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{bill.fileName}</h3>
                <p className="text-muted-foreground text-sm">
                  {bill.billType} • {bill.source}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-xs">{bill.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
