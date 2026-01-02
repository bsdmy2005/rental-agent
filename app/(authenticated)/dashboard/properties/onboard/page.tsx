"use server"

import { Suspense } from "react"
import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { PropertyOnboardingWizard } from "./_components/property-onboarding-wizard"
import { WizardStateProvider } from "./_components/wizard-state"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function OnboardPropertyPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  if (!userProfile) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" asChild className="w-fit">
          <Link href="/dashboard/properties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">User profile not found.</p>
        </div>
      </div>
    )
  }

  // Allow landlords and rental agents
  if (userProfile.userType !== "landlord" && userProfile.userType !== "rental_agent") {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" asChild className="w-fit">
          <Link href="/dashboard/properties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Only landlords and rental agents can onboard properties.
          </p>
        </div>
      </div>
    )
  }

  let landlordId: string | null = null

  // For landlords, get their landlordId (optional - they can still proceed without it)
  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    landlordId = landlord?.id || null

    // Note: Landlords can still create properties even if they haven't completed onboarding
    // The property owner details will be captured in the form
  }
  // For rental agents, landlordId is null - they'll enter property owner details directly

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" asChild className="mb-4 w-fit">
          <Link href="/dashboard/properties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Onboard New Property</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Complete the setup for your new property, including templates, tenants, and schedules
          </p>
        </div>
      </div>

      <WizardStateProvider>
        <PropertyOnboardingWizard landlordId={landlordId} />
      </WizardStateProvider>
    </div>
  )
}

