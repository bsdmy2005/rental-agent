"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { DashboardStats } from "./_components/dashboard-stats"
import { DashboardStatsSkeleton } from "./_components/dashboard-stats-skeleton"

export default async function DashboardPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back{userProfile?.firstName ? `, ${userProfile.firstName}` : ""}! Here's your
            rental property management overview.
          </p>
        </div>

        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats />
        </Suspense>
      </div>
    </div>
  )
}
