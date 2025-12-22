"use server"

import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"

export default async function AddPropertyPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  let landlordId: string | null = null
  if (userProfile?.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    landlordId = landlord?.id || null
  }

  if (userProfile?.userType === "landlord" && !landlordId) {
    // Redirect to onboarding if landlord profile not complete
    redirect("/onboarding/landlord")
  }

  if (!landlordId) {
    // Redirect to properties list if not a landlord
    redirect("/dashboard/properties")
  }

  // Redirect to the onboarding wizard
  redirect("/dashboard/properties/onboard")
}

