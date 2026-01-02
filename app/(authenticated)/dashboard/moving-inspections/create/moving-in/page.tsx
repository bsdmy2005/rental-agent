"use server"

import { notFound, redirect } from "next/navigation"
import { db } from "@/db"
import { leaseAgreementsTable, tenantsTable, propertiesTable } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { InspectionWizard } from "../../../leases/[leaseId]/inspections/new/_components/inspection-wizard"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesForUserQuery } from "@/queries/properties-queries"

interface NewMovingInPageProps {
  searchParams: Promise<{ leaseId?: string; propertyId?: string }>
}

export default async function NewMovingInPage({ searchParams }: NewMovingInPageProps) {
  const params = await searchParams
  const { leaseId, propertyId } = params

  if (!leaseId) {
    redirect("/dashboard/moving-inspections")
  }

  // Verify user has access
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    redirect("/onboarding")
  }

  // Verify property belongs to user
  if (propertyId) {
    let userPropertyIds: string[] = []
    if (userProfile.userType === "landlord") {
      const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
      if (landlord) {
        const props = await getPropertiesByLandlordIdQuery(landlord.id)
        userPropertyIds = props.map((p) => p.id)
      }
    } else if (userProfile.userType === "rental_agent") {
      const props = await getPropertiesForUserQuery(userProfile.id, userProfile.userType)
      userPropertyIds = props.map((p) => p.id)
    }

    if (!userPropertyIds.includes(propertyId)) {
      redirect("/dashboard/moving-inspections")
    }
  }

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

