"use server"

import { notFound } from "next/navigation"
import { db } from "@/db"
import { leaseAgreementsTable, tenantsTable, propertiesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
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
      />
    </div>
  )
}

