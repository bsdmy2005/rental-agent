"use server"

import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { LandlordOnboarding } from "./_components/landlord-onboarding"
import { RentalAgentOnboarding } from "./_components/rental-agent-onboarding"
import { TenantOnboarding } from "./_components/tenant-onboarding"

export default async function UserTypeOnboardingPage({
  params
}: {
  params: Promise<{ userType: string }>
}) {
  const { userType } = await params
  const user = await currentUser()

  if (!user) {
    redirect("/login")
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)

  if (!userProfile || userProfile.userType !== userType) {
    redirect("/onboarding")
  }

  if (userProfile.onboardingCompleted) {
    if (userProfile.userType === "tenant") {
      redirect("/tenant/dashboard")
    } else {
      redirect("/dashboard")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {userType === "landlord" && <LandlordOnboarding userProfileId={userProfile.id} />}
        {userType === "rental_agent" && <RentalAgentOnboarding userProfileId={userProfile.id} />}
        {userType === "tenant" && <TenantOnboarding userProfileId={userProfile.id} />}
        {userType === "admin" && (
          <div className="text-center">
            <p>Admin onboarding coming soon</p>
          </div>
        )}
      </div>
    </div>
  )
}

