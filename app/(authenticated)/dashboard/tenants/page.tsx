"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery } from "@/queries/properties-queries"
import { TenantsList } from "./_components/tenants-list"
import { TenantsListSkeleton } from "./_components/tenants-list-skeleton"
import { TenantFormWrapper } from "./_components/tenant-form-wrapper"

export default async function TenantsPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  let properties: Array<{ id: string; name: string }> = []
  if (userProfile?.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tenants</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {properties.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Add New Tenant</h2>
            <TenantFormWrapper properties={properties} />
          </div>
        )}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Your Tenants</h2>
          <Suspense fallback={<TenantsListSkeleton />}>
            <TenantsList />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

