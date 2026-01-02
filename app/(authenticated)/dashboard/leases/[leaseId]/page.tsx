"use server"

import { notFound } from "next/navigation"
import { db } from "@/db"
import { leaseAgreementsTable, tenantsTable, propertiesTable, movingInspectionsTable, movingInspectionComparisonsTable } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { LeaseDetailsClient } from "./_components/lease-details-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface LeaseDetailsPageProps {
  params: Promise<{ leaseId: string }>
}

export default async function LeaseDetailsPage({ params }: LeaseDetailsPageProps) {
  const { leaseId } = await params

  // Get lease with manual joins
  const [lease] = await db
    .select()
    .from(leaseAgreementsTable)
    .where(eq(leaseAgreementsTable.id, leaseId))
    .limit(1)

  if (!lease) {
    notFound()
  }

  // Get tenant and property
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.id, lease.tenantId))
    .limit(1)

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, lease.propertyId))
    .limit(1)

  // Get all inspections for this lease
  const allInspections = await db
    .select()
    .from(movingInspectionsTable)
    .where(eq(movingInspectionsTable.leaseAgreementId, leaseId))
    .orderBy(desc(movingInspectionsTable.createdAt))

  // Get move-in inspection for this lease (most recent, completed or signed)
  const moveInInspections = allInspections.filter(
    (i) => i.inspectionType === "moving_in" && (i.status === "completed" || i.status === "signed")
  )
  const moveInInspection = moveInInspections[0] || null

  // Separate move-in and move-out inspections
  const moveInInspectionsList = allInspections.filter((i) => i.inspectionType === "moving_in")
  const moveOutInspectionsList = allInspections.filter((i) => i.inspectionType === "moving_out")

  // For each move-in inspection, check if a move-out exists by querying comparison table
  const moveInWithMoveOutStatus = await Promise.all(
    moveInInspectionsList.map(async (moveIn) => {
      const moveOutForMoveIn = await db
        .select({ movingOutInspectionId: movingInspectionComparisonsTable.movingOutInspectionId })
        .from(movingInspectionComparisonsTable)
        .where(eq(movingInspectionComparisonsTable.movingInInspectionId, moveIn.id))
        .limit(1)

      return {
        id: moveIn.id,
        status: moveIn.status,
        createdAt: moveIn.createdAt,
        hasMoveOut: moveOutForMoveIn.length > 0
      }
    })
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/leases">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leases
          </Button>
        </Link>
      </div>

      <LeaseDetailsClient
        lease={{
          ...lease,
          tenant: tenant || null,
          property: property || null
        }}
        moveInInspection={moveInInspection ? {
          id: moveInInspection.id,
          status: moveInInspection.status
        } : null}
        inspections={{
          moveIn: moveInWithMoveOutStatus,
          moveOut: moveOutInspectionsList.map((i) => ({
            id: i.id,
            status: i.status,
            createdAt: i.createdAt
          }))
        }}
      />
    </div>
  )
}

