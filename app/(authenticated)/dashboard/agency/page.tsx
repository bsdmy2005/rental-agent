"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getRentalAgenciesByOwnerIdQuery } from "@/queries/rental-agencies-queries"
import { AgencyOverview } from "./_components/agency-overview"
import { AgencyOverviewSkeleton } from "./_components/agency-overview-skeleton"

export default async function AgencyDashboardPage() {
  const { userId } = await auth()
  if (!userId) {
    return <div>You must be logged in</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(userId)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const agencies = await getRentalAgenciesByOwnerIdQuery(userProfile.id)

  if (agencies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          You don't own any agencies yet. Create one during onboarding or in the admin panel.
        </p>
      </div>
    )
  }

  // For now, show the first agency. Later can be expanded to support multiple agencies
  const agency = agencies[0]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">{agency.name}</h1>
        <p className="text-muted-foreground mt-2">Agency Management Dashboard</p>
      </div>
      <Suspense fallback={<AgencyOverviewSkeleton />}>
        <AgencyOverview agencyId={agency.id} />
      </Suspense>
    </div>
  )
}

