"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery } from "@/queries/properties-queries"
import { SelectPropertyForLease } from "./_components/select-property-for-lease"
import { SelectPropertyForLeaseSkeleton } from "./_components/select-property-for-lease-skeleton"

export default async function NewLeaseSelectPropertyPage() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Generate New Lease Document</h1>
        <p className="text-muted-foreground mt-2">
          Select a property to create a new lease agreement for.
        </p>
      </div>

      <Suspense fallback={<SelectPropertyForLeaseSkeleton />}>
        <SelectPropertyForLease userProfile={userProfile} />
      </Suspense>
    </div>
  )
}

