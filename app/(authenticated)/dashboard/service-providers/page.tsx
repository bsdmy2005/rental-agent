"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getServiceProvidersByAreaAction } from "@/actions/service-providers-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ServiceProvidersList } from "./_components/service-providers-list"

export default async function ServiceProvidersPage() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  // Only landlords and rental agents can access this
  if (userProfile.userType !== "landlord" && userProfile.userType !== "rental_agent") {
    return <div>Unauthorized</div>
  }

  const providersResult = await getServiceProvidersByAreaAction()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Providers</h1>
          <p className="text-muted-foreground">Manage your service provider contacts</p>
        </div>
        <Link href="/dashboard/service-providers/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Providers Directory</CardTitle>
          <CardDescription>Find and manage service providers by area</CardDescription>
        </CardHeader>
        <CardContent>
          {providersResult.isSuccess && providersResult.data ? (
            <ServiceProvidersList providers={providersResult.data} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {providersResult.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

