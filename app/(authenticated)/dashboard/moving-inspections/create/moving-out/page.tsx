"use server"

import { notFound, redirect } from "next/navigation"
import { db } from "@/db"
import { movingInspectionsTable, leaseAgreementsTable, propertiesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { createMovingOutFromMovingInAction } from "@/actions/moving-inspections-actions"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesForUserQuery } from "@/queries/properties-queries"

interface NewMovingOutPageProps {
  searchParams: Promise<{ movingInId?: string; propertyId?: string }>
}

export default async function NewMovingOutPage({ searchParams }: NewMovingOutPageProps) {
  const params = await searchParams
  const { movingInId, propertyId } = params

  if (!movingInId) {
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

  // Get moving-in inspection
  const [movingInInspection] = await db
    .select()
    .from(movingInspectionsTable)
    .where(eq(movingInspectionsTable.id, movingInId))
    .limit(1)

  if (!movingInInspection) {
    notFound()
  }

  // Verify it's a moving-in inspection
  if (movingInInspection.inspectionType !== "moving_in") {
    notFound()
  }

  // Verify status is completed or signed
  if (movingInInspection.status !== "completed" && movingInInspection.status !== "signed") {
    redirect(`/dashboard/moving-inspections/${movingInId}`)
  }

  // Verify property belongs to user if propertyId provided
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

    // Get lease to verify property
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, movingInInspection.leaseAgreementId))
      .limit(1)

    if (lease && !userPropertyIds.includes(lease.propertyId)) {
      redirect("/dashboard/moving-inspections")
    }
  }

  // Create move-out inspection
  const result = await createMovingOutFromMovingInAction(movingInId)

  if (!result.isSuccess || !result.data) {
    redirect(`/dashboard/moving-inspections/${movingInId}`)
  }

  // Redirect to the new move-out inspection detail page
  redirect(`/dashboard/moving-inspections/${result.data.id}`)
}

