"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { db } from "@/db"
import { quoteRequestsTable, propertiesTable, incidentsTable, serviceProvidersTable } from "@/db/schema"
import { eq, and, or, desc, isNull, inArray } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { RfqsList } from "./_components/rfqs-list"

async function getRfqsForUser(userProfileId: string, userType: string) {
  // Get property IDs based on user type
  let propertyIds: string[] = []

  if (userType === "landlord") {
    const { getLandlordByUserProfileIdQuery } = await import("@/queries/landlords-queries")
    const landlord = await getLandlordByUserProfileIdQuery(userProfileId)
    if (landlord) {
      const properties = await db
        .select({ id: propertiesTable.id })
        .from(propertiesTable)
        .where(eq(propertiesTable.landlordId, landlord.id))
      propertyIds = properties.map((p) => p.id)
    }
  } else if (userType === "rental_agent") {
    const { getRentalAgentByUserProfileIdQuery } = await import("@/queries/rental-agents-queries")
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfileId)
    if (rentalAgent) {
      const { propertyManagementsTable } = await import("@/db/schema")
      const managements = await db
        .select({ propertyId: propertyManagementsTable.propertyId })
        .from(propertyManagementsTable)
        .where(
          and(
            eq(propertyManagementsTable.rentalAgentId, rentalAgent.id),
            eq(propertyManagementsTable.isActive, true)
          )
        )
      propertyIds = managements.map((m) => m.propertyId)
    }
  }

  if (propertyIds.length === 0) {
    return []
  }

  // Get all RFQs for these properties
  const rfqs = await db
    .select()
    .from(quoteRequestsTable)
    .where(or(...propertyIds.map((id) => eq(quoteRequestsTable.propertyId, id))))
    .orderBy(desc(quoteRequestsTable.requestedAt))

  // Get unique property and service provider IDs
  const uniquePropertyIds = [...new Set(rfqs.map((r) => r.propertyId).filter(Boolean) as string[])]
  const uniqueProviderIds = [...new Set(rfqs.map((r) => r.serviceProviderId))]

  // Fetch properties and service providers
  const properties =
    uniquePropertyIds.length > 0
      ? await db
          .select({
            id: propertiesTable.id,
            name: propertiesTable.name,
            suburb: propertiesTable.suburb,
            province: propertiesTable.province
          })
          .from(propertiesTable)
          .where(inArray(propertiesTable.id, uniquePropertyIds))
      : []

  const serviceProviders =
    uniqueProviderIds.length > 0
      ? await db
          .select({
            id: serviceProvidersTable.id,
            businessName: serviceProvidersTable.businessName,
            contactName: serviceProvidersTable.contactName
          })
          .from(serviceProvidersTable)
          .where(inArray(serviceProvidersTable.id, uniqueProviderIds))
      : []

  // Create maps for quick lookup
  const propertyMap = new Map(properties.map((p) => [p.id, p]))
  const providerMap = new Map(serviceProviders.map((p) => [p.id, p]))

  // Combine data
  return rfqs.map((rfq) => ({
    rfq,
    property: rfq.propertyId ? propertyMap.get(rfq.propertyId) || null : null,
    serviceProvider: providerMap.get(rfq.serviceProviderId) || null
  }))
}

export default async function RfqsPage() {
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

  const rfqs = await getRfqsForUser(userProfile.id, userProfile.userType)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RFQs</h1>
          <p className="text-muted-foreground">Manage your quote requests</p>
        </div>
        <Link href="/dashboard/rfqs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New RFQ
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All RFQs</CardTitle>
          <CardDescription>
            {rfqs.length === 0
              ? "No RFQs found"
              : `Showing ${rfqs.length} RFQ${rfqs.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RfqsList rfqs={rfqs} />
        </CardContent>
      </Card>
    </div>
  )
}

