"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesByRentalAgentIdQuery } from "@/queries/properties-queries"
import { getBillingSchedulesForUserPropertiesQuery } from "@/queries/billing-schedules-queries"
import { BillingSchedulesList } from "./_components/billing-schedules-list"
import { BillingSchedulesListSkeleton } from "./_components/billing-schedules-list-skeleton"

export default async function BillingSchedulesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Schedules</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View and manage billing schedules for your properties
          </p>
        </div>
      </div>

      <Suspense fallback={<BillingSchedulesListSkeleton />}>
        <BillingSchedulesList />
      </Suspense>
    </div>
  )
}

