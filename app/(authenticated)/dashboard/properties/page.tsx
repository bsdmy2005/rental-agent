"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { PropertiesList } from "./_components/properties-list"
import { PropertiesListSkeleton } from "./_components/properties-list-skeleton"
import { PropertyForm } from "./_components/property-form"

export default async function PropertiesPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  let landlordId: string | null = null
  if (userProfile?.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    landlordId = landlord?.id || null
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Properties</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {landlordId && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Add New Property</h2>
            <PropertyForm landlordId={landlordId} />
          </div>
        )}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Your Properties</h2>
          <Suspense fallback={<PropertiesListSkeleton />}>
            <PropertiesList />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

