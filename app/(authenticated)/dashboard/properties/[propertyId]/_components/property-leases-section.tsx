"use server"

import { db } from "@/db"
import { tenantsTable } from "@/db/schema"
import { inArray } from "drizzle-orm"
import { getLeaseAgreementsByPropertyIdQuery } from "@/queries/lease-agreements-queries"
import { PropertyLeasesSectionClient } from "./property-leases-section-client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, FileCheck } from "lucide-react"

interface PropertyLeasesSectionProps {
  propertyId: string
}

export async function PropertyLeasesSection({ propertyId }: PropertyLeasesSectionProps) {
  // Get all leases for this property
  const leases = await getLeaseAgreementsByPropertyIdQuery(propertyId)

  if (leases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No lease agreements found for this property.</p>
        <Link href={`/dashboard/properties/${propertyId}/leases/new`}>
          <Button variant="outline" className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Initiate New Lease
          </Button>
        </Link>
      </div>
    )
  }

  // Batch fetch tenants
  const tenantIds = [...new Set(leases.map((l) => l.tenantId))]
  const tenants = tenantIds.length > 0
    ? await db.select().from(tenantsTable).where(inArray(tenantsTable.id, tenantIds))
    : []

  const tenantsMap = new Map(tenants.map((t) => [t.id, t]))

  // Group leases by status
  const pendingLeases = leases.filter(
    (l) =>
      l.initiationStatus === "sent_to_landlord" ||
      l.initiationStatus === "landlord_signed" ||
      l.initiationStatus === "sent_to_tenant" ||
      l.initiationStatus === "tenant_signed"
  )
  const signedLeases = leases.filter(
    (l) => l.initiationStatus === "fully_executed" || (l.signedByTenant && l.signedByLandlord)
  )
  const draftLeases = leases.filter((l) => l.initiationStatus === "draft")

  return (
    <PropertyLeasesSectionClient
      leases={leases.map((lease) => ({
        ...lease,
        tenant: tenantsMap.get(lease.tenantId) || null
      }))}
      propertyId={propertyId}
      pendingCount={pendingLeases.length}
      signedCount={signedLeases.length}
      draftCount={draftLeases.length}
    />
  )
}

