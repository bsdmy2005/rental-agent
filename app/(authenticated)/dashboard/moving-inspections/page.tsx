"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesForUserQuery } from "@/queries/properties-queries"
import { MovingInspectionsList } from "./_components/moving-inspections-list"
import { MovingInspectionsListSkeleton } from "./_components/moving-inspections-list-skeleton"
import { InspectionWorkflowClient } from "./_components/inspection-workflow-client"
import { db } from "@/db"
import { movingInspectionsTable, leaseAgreementsTable } from "@/db/schema"
import { inArray, eq, desc, and, or } from "drizzle-orm"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function MovingInspectionsPage() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  // Get user's properties
  let properties: Array<{ id: string; name: string }> = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const props = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = props.map((p) => ({ id: p.id, name: p.name }))
    }
  } else if (userProfile.userType === "rental_agent") {
    const props = await getPropertiesForUserQuery(userProfile.id, userProfile.userType)
    properties = props.map((p) => ({ id: p.id, name: p.name }))
  }

  // Get all moving-in inspections for user's properties (for moving-out workflow)
  const propertyIds = properties.map((p) => p.id)
  let movingInInspections: Array<{
    id: string
    status: string
    createdAt: Date
    leaseAgreement: {
      tenant: { name: string } | null
      property: { id: string; name: string } | null
    } | null
  }> = []

  if (propertyIds.length > 0) {
    const leases = await db
      .select()
      .from(leaseAgreementsTable)
      .where(inArray(leaseAgreementsTable.propertyId, propertyIds))

    const leaseIds = leases.map((l) => l.id)

    if (leaseIds.length > 0) {
      const inspections = await db
        .select()
        .from(movingInspectionsTable)
        .where(
          and(
            inArray(movingInspectionsTable.leaseAgreementId, leaseIds),
            eq(movingInspectionsTable.inspectionType, "moving_in")
          )
        )
        .orderBy(desc(movingInspectionsTable.createdAt))

      // Map inspections with lease details
      movingInInspections = inspections.map((inspection) => {
        const lease = leases.find((l) => l.id === inspection.leaseAgreementId)
        const property = properties.find((p) => p.id === lease?.propertyId)

        return {
          id: inspection.id,
          status: inspection.status,
          createdAt: inspection.createdAt,
          leaseAgreement: lease
            ? {
                tenant: null, // Will be populated if needed
                property: property ? { id: property.id, name: property.name } : null
              }
            : null
        }
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Moving Inspections</h1>
        <p className="text-muted-foreground mt-2">
          Manage moving-in and moving-out inspections for lease agreements.
        </p>
      </div>

      <Tabs defaultValue="workflow" className="w-full">
        <TabsList>
          <TabsTrigger value="workflow">Create Inspection</TabsTrigger>
          <TabsTrigger value="list">View All Inspections</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow">
          <InspectionWorkflowClient
            properties={properties}
            movingInInspections={movingInInspections}
          />
        </TabsContent>

        <TabsContent value="list">
          <Suspense fallback={<MovingInspectionsListSkeleton />}>
            <MovingInspectionsList />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

