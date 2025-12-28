"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getIncidentsByPropertyIdAction } from "@/actions/incidents-actions"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IncidentsManagementList } from "./_components/incidents-management-list"

export default async function PropertyIncidentsPage({
  params
}: {
  params: Promise<{ propertyId: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { propertyId } = await params
  const property = await getPropertyByIdQuery(propertyId)

  if (!property) {
    notFound()
  }

  const incidentsResult = await getIncidentsByPropertyIdAction(propertyId)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/properties/${propertyId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">{property.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property Incidents</CardTitle>
          <CardDescription>Manage and track tenant-reported incidents</CardDescription>
        </CardHeader>
        <CardContent>
          {incidentsResult.isSuccess && incidentsResult.data ? (
            <IncidentsManagementList
              incidents={incidentsResult.data}
              propertyId={propertyId}
            />
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

