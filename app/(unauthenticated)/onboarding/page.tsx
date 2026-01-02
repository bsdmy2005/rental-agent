"use server"

import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { UserTypeSelector } from "./_components/user-type-selector"

export default async function OnboardingPage() {
  const user = await currentUser()

  if (!user) {
    redirect("/login")
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)

  // If user already has a profile and completed onboarding, redirect to dashboard
  if (userProfile?.onboardingCompleted) {
    if (userProfile.userType === "tenant") {
      redirect("/tenant/dashboard")
    } else {
      redirect("/dashboard")
    }
  }

  // If user has a profile but hasn't completed onboarding, show the appropriate onboarding form
  if (userProfile && !userProfile.onboardingCompleted) {
    // Redirect to specific onboarding form based on user type
    redirect(`/onboarding/${userProfile.userType}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Welcome to PropNxt.AI</h1>
          <p className="text-muted-foreground mt-2">
            Let's set up your account. Choose your user type to get started.
          </p>
        </div>
        <UserTypeSelector />
      </div>
    </div>
  )
}

