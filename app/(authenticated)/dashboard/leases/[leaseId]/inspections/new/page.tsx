"use server"

import { notFound, redirect } from "next/navigation"
import { db } from "@/db"
import { leaseAgreementsTable, tenantsTable, propertiesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { InspectionWizard } from "./_components/inspection-wizard"

interface NewInspectionPageProps {
  params: Promise<{ leaseId: string }>
}

export default async function NewInspectionPage({ params }: NewInspectionPageProps) {
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

  // Verify lease is signed by both parties
  if (!lease.signedByTenant || !lease.signedByLandlord) {
    redirect(`/dashboard/leases/${leaseId}`)
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

  return (
    <div className="container mx-auto py-6">
      <InspectionWizard
        leaseId={leaseId}
        tenant={tenant || null}
        property={property || null}
      />
    </div>
  )
}

