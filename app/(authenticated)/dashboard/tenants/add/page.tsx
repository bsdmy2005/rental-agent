"use server"

import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery } from "@/queries/properties-queries"
import { TenantFormWrapper } from "../_components/tenant-form-wrapper"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function AddTenantPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  let properties: Array<{ id: string; name: string }> = []
  if (userProfile?.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" asChild className="mb-4 w-fit">
          <Link href="/dashboard/tenants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Tenant</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Add a new tenant to one of your properties
          </p>
        </div>
      </div>

      {properties.length > 0 ? (
        <div className="max-w-2xl">
          <TenantFormWrapper properties={properties} />
        </div>
      ) : (
        <div className="max-w-2xl rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/20">
          <h2 className="mb-2 text-xl font-semibold">No Properties Available</h2>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            You need to create at least one property before you can add tenants.{" "}
            <Link href="/dashboard/properties/add" className="font-medium underline">
              Add a property
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}

