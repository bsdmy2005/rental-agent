"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import {
  getPropertiesByLandlordIdQuery,
  getPropertiesByRentalAgentIdQuery,
  getPropertyByIdQuery
} from "@/queries/properties-queries"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"
import { BillsTable } from "./bills-table"

export async function BillsList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const allBills = []
  let properties: Array<{ id: string; name: string }> = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
      for (const property of landlordProperties) {
        const bills = await getBillsByPropertyIdQuery(property.id)
        allBills.push(...bills)
      }
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const agentProperties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      properties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
      for (const property of agentProperties) {
        const bills = await getBillsByPropertyIdQuery(property.id)
        allBills.push(...bills)
      }
    }
  }

  // Fetch property names for bills
  const billsWithProperties = await Promise.all(
    allBills.map(async (bill) => {
      const property = await getPropertyByIdQuery(bill.propertyId)
      return {
        ...bill,
        propertyName: property?.name || "Unknown Property"
      }
    })
  )

  return <BillsTable bills={billsWithProperties} properties={properties} />
}
