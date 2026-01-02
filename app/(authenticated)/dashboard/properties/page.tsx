"use server"

import { Suspense } from "react"
import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PropertiesList } from "./_components/properties-list"
import { PropertiesListSkeleton } from "./_components/properties-list-skeleton"

export default async function PropertiesPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null
  const canAddProperties = userProfile?.userType === "landlord" || userProfile?.userType === "rental_agent"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {userProfile?.userType === "landlord" ? "View Properties" : "Managed Properties"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {userProfile?.userType === "landlord" ? "Manage and edit your properties" : "Properties you manage"}
          </p>
        </div>
        {canAddProperties && (
          <Button asChild>
            <Link href="/dashboard/properties/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Link>
          </Button>
        )}
      </div>

      <Suspense fallback={<PropertiesListSkeleton />}>
        <PropertiesList />
      </Suspense>
    </div>
  )
}

