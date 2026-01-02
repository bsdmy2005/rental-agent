"use server"

import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"

export default async function AddPropertyPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  if (!userProfile) {
    redirect("/dashboard/properties")
  }

  // Allow landlords and rental agents
  if (userProfile.userType !== "landlord" && userProfile.userType !== "rental_agent") {
    redirect("/dashboard/properties")
  }

  // For landlords, get their landlordId (optional)
  let landlordId: string | null = null
  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    landlordId = landlord?.id || null
    // Note: Landlords can proceed even without completing onboarding
    // Property owner details will be captured in the form
  }

  // For rental agents, landlordId is null - they'll enter property owner details directly
  // Redirect to the onboarding wizard
  redirect("/dashboard/properties/onboard")
}

