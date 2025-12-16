"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery } from "@/queries/properties-queries"
import { getBillsByStatusQuery } from "@/queries/bills-queries"

export async function DashboardStats() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  let propertyCount = 0
  let pendingBillsCount = 0

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const properties = await getPropertiesByLandlordIdQuery(landlord.id)
      propertyCount = properties.length
    }
  }

  const pendingBills = await getBillsByStatusQuery("pending")
  pendingBillsCount = pendingBills.length

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">Properties</div>
        <div className="text-2xl font-bold">{propertyCount}</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">Pending Bills</div>
        <div className="text-2xl font-bold">{pendingBillsCount}</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">Active Rules</div>
        <div className="text-2xl font-bold">-</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">This Month</div>
        <div className="text-2xl font-bold">-</div>
      </div>
    </div>
  )
}

