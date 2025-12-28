"use server"

import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { ServiceProviderForm } from "./_components/service-provider-form"

export default async function NewServiceProviderPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    redirect("/onboarding")
  }

  // Only landlords and rental agents can access
  if (userProfile.userType !== "landlord" && userProfile.userType !== "rental_agent") {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6">
      <ServiceProviderForm createdBy={userProfile.id} />
    </div>
  )
}

