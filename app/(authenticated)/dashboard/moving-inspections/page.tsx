"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { MovingInspectionsList } from "./_components/moving-inspections-list"
import { MovingInspectionsListSkeleton } from "./_components/moving-inspections-list-skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function MovingInspectionsPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Moving Inspections</h1>
          <p className="text-muted-foreground mt-2">
            Manage moving-in and moving-out inspections for lease agreements.
          </p>
        </div>

        {userProfile && (
          <Button asChild>
            <Link href="/dashboard/moving-inspections/new">
              <Plus className="mr-2 h-4 w-4" />
              New Inspection
            </Link>
          </Button>
        )}
      </div>

      <div>
        <Suspense fallback={<MovingInspectionsListSkeleton />}>
          <MovingInspectionsList />
        </Suspense>
      </div>
    </div>
  )
}

