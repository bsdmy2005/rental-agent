"use server"

import { Suspense } from "react"
import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { PropertyForm } from "../_components/property-form"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function AddPropertyPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  let landlordId: string | null = null
  if (userProfile?.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    landlordId = landlord?.id || null
  }

  if (userProfile?.userType === "landlord" && !landlordId) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" asChild className="w-fit">
          <Link href="/dashboard/properties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Link>
        </Button>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Please complete your onboarding to add properties.{" "}
            <Link href="/onboarding/landlord" className="underline">
              Complete onboarding
            </Link>
          </p>
        </div>
      </div>
    )
  }

  if (!landlordId) {
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
            You must be a landlord to add properties.
          </p>
        </div>
      </div>
    )
  }

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
          <h1 className="text-3xl font-bold">Add New Property</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create a new property for your portfolio
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <PropertyForm landlordId={landlordId} />
      </div>
    </div>
  )
}

