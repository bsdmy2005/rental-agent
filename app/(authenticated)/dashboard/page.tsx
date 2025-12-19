"use server"

import { Suspense } from "react"
import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { Button } from "@/components/ui/button"
import { Home, Users } from "lucide-react"
import { DashboardStats } from "./_components/dashboard-stats"
import { DashboardStatsSkeleton } from "./_components/dashboard-stats-skeleton"

export default async function DashboardPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  let landlordId: string | null = null
  if (userProfile?.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    landlordId = landlord?.id || null
  }

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

        {userProfile?.userType === "landlord" && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              {landlordId ? (
                <>
                  <Button asChild>
                    <Link href="/dashboard/properties">
                      <Home className="mr-2 h-4 w-4" />
                      Add Property
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/tenants">
                      <Users className="mr-2 h-4 w-4" />
                      Add Tenant
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/20">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Please complete your onboarding to start adding properties and tenants.{" "}
                    <Link href="/onboarding/landlord" className="font-medium underline">
                      Complete onboarding
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats />
        </Suspense>
      </div>
    </div>
  )
}
