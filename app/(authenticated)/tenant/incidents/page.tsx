"use server"

import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getTenantByUserProfileIdQuery } from "@/queries/tenants-queries"
import { getIncidentsByTenantIdAction } from "@/actions/incidents-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import Link from "next/link"
import { IncidentsList } from "./_components/incidents-list"

export default async function TenantIncidentsPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile || userProfile.userType !== "tenant") {
    redirect("/dashboard")
  }

  const tenant = await getTenantByUserProfileIdQuery(userProfile.id)
  if (!tenant) {
    return <div>Tenant record not found</div>
  }

  const incidentsResult = await getIncidentsByTenantIdAction(tenant.id)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reported Issues</h1>
          <p className="text-muted-foreground">Track the status of your reported issues</p>
        </div>
        <Link href="/tenant/incidents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Report Issue
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Incidents</CardTitle>
          <CardDescription>View and track all issues you've reported</CardDescription>
        </CardHeader>
        <CardContent>
          {incidentsResult.isSuccess && incidentsResult.data ? (
            <IncidentsList incidents={incidentsResult.data} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {incidentsResult.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

